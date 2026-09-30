/**
 * Transaction coordinator. Each function:
 *   1. Calls the chain adapter to submit the user-signed tx
 *   2. Waits for confirmation
 *   3. Notifies the BE with the real tx hash so it can verify the receipt
 *      and index events into Mongo
 *
 * Pure errors only — no silent mocks. UI surfaces failures via the toast system.
 */

import { ethers } from "ethers"; // adapter abstracts away in the calls below; we only use BigInt + isAddress here
import { ABIS } from "./abis";
import { activeChain } from "./wallet";
import { usdcToRaw } from "./format";
import { api } from "./api";

const ADAPTER = activeChain.adapter;
const ADDRS = activeChain.contracts;

// ----------------------------------------------------------------
// Internals
// ----------------------------------------------------------------

async function _approveUsdcIfNeeded(owner, spender, amountRaw) {
  /* Read current allowance via adapter; if < amount, request approval. */
  const allowance = await ADAPTER.readContract(
    activeChain,
    "USDC",
    [
      "function allowance(address owner, address spender) external view returns (uint256)",
    ],
    "allowance",
    [owner, spender]
  );
  if (BigInt(allowance) >= BigInt(amountRaw)) return null;

  const result = await ADAPTER.approveToken(
    activeChain,
    ADDRS.USDC,
    spender,
    amountRaw
  );
  await result.wait(1);
  return result.txHash;
}

function _assertConnected(addr) {
  if (!addr || !ethers.isAddress(addr)) {
    throw new Error("Wallet not connected");
  }
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

export const txCoordinator = {
  // ============== USDC ==============

  async faucet(walletAddress, amountUsdc = 100) {
    _assertConnected(walletAddress);
    // We hit the BE endpoint — admin mints to the wallet (MockUSDC.mintTo is permissionless)
    return await api.faucet({ wallet_address: walletAddress, amount_usdc: amountUsdc });
  },

  // ============== Borrow ==============

  async borrow(walletAddress, tokenId, amountUsdc, termDays = 30) {
    _assertConnected(walletAddress);
    if (!tokenId || tokenId === 0) {
      throw new Error("You need a CreditGraph identity first. Onboard via the landing page.");
    }

    const amountRaw = usdcToRaw(amountUsdc);

    const result = await ADAPTER.sendTransaction(
      activeChain,
      "LoanManager",
      ABIS.LoanManager,
      "originate",
      [BigInt(tokenId), amountRaw, BigInt(termDays)]
    );
    const receipt = await result.wait(1);

    // Notify BE so it indexes the loan
    const beResponse = await api.borrowFunds({
      wallet_address: walletAddress,
      tx_hash: result.txHash,
    });

    return { txHash: result.txHash, receipt, ...beResponse };
  },

  // ============== Repay ==============

  async repay(walletAddress, loanId, amountUsdc) {
    _assertConnected(walletAddress);
    const amountRaw = usdcToRaw(amountUsdc);

    // 1. Approve LoanManager to pull USDC
    await _approveUsdcIfNeeded(walletAddress, ADDRS.LoanManager, amountRaw);

    // 2. Repay
    const result = await ADAPTER.sendTransaction(
      activeChain,
      "LoanManager",
      ABIS.LoanManager,
      "repay",
      [BigInt(loanId), amountRaw]
    );
    await result.wait(1);

    const beResponse = await api.repayLoan({
      wallet_address: walletAddress,
      tx_hash: result.txHash,
    });

    return { txHash: result.txHash, ...beResponse };
  },

  // ============== Vouch (attest) ==============

  async vouch(walletAddress, subjectTokenId, bondUsdc, durationDays = 90, relType = "AJO") {
    _assertConnected(walletAddress);
    const bondRaw = usdcToRaw(bondUsdc);
    const duration = BigInt(durationDays * 86400);
    const relTypeBytes32 = ethers.encodeBytes32String(relType);

    // 1. Approve SocialAttestation to pull the bond
    await _approveUsdcIfNeeded(walletAddress, ADDRS.SocialAttestation, bondRaw);

    // 2. Attest
    const result = await ADAPTER.sendTransaction(
      activeChain,
      "SocialAttestation",
      ABIS.SocialAttestation,
      "attest",
      [BigInt(subjectTokenId), bondRaw, duration, relTypeBytes32]
    );
    await result.wait(1);

    const beResponse = await api.attest({ tx_hash: result.txHash });
    return { txHash: result.txHash, ...beResponse };
  },

  async requestRevoke(attestationId) {
    const result = await ADAPTER.sendTransaction(
      activeChain,
      "SocialAttestation",
      ABIS.SocialAttestation,
      "requestRevoke",
      [BigInt(attestationId)]
    );
    await result.wait(1);

    const beResponse = await api.revokeAttestation({
      attestation_id: Number(attestationId),
      tx_hash: result.txHash,
      action: "request",
    });
    return { txHash: result.txHash, ...beResponse };
  },

  async finalizeRevoke(attestationId) {
    const result = await ADAPTER.sendTransaction(
      activeChain,
      "SocialAttestation",
      ABIS.SocialAttestation,
      "revoke",
      [BigInt(attestationId)]
    );
    await result.wait(1);

    const beResponse = await api.revokeAttestation({
      attestation_id: Number(attestationId),
      tx_hash: result.txHash,
      action: "finalize",
    });
    return { txHash: result.txHash, ...beResponse };
  },

  // ============== Pool (ERC-4626) ==============

  async supply(walletAddress, amountUsdc) {
    _assertConnected(walletAddress);
    const amountRaw = usdcToRaw(amountUsdc);

    await _approveUsdcIfNeeded(walletAddress, ADDRS.LendingPool, amountRaw);

    const result = await ADAPTER.sendTransaction(
      activeChain,
      "LendingPool",
      ABIS.LendingPool,
      "deposit",
      [amountRaw, walletAddress]
    );
    await result.wait(1);

    const beResponse = await api.supply({
      wallet_address: walletAddress,
      tx_hash: result.txHash,
    });
    return { txHash: result.txHash, ...beResponse };
  },

  async withdraw(walletAddress, amountUsdc) {
    _assertConnected(walletAddress);
    const amountRaw = usdcToRaw(amountUsdc);

    const result = await ADAPTER.sendTransaction(
      activeChain,
      "LendingPool",
      ABIS.LendingPool,
      "withdraw",
      [amountRaw, walletAddress, walletAddress]
    );
    await result.wait(1);

    const beResponse = await api.withdraw({
      wallet_address: walletAddress,
      tx_hash: result.txHash,
    });
    return { txHash: result.txHash, ...beResponse };
  },

  // ============== Score finalize / challenge (anyone can poke) ==============

  async finalizeScore(tokenId) {
    const result = await ADAPTER.sendTransaction(
      activeChain,
      "ScoringOracle",
      ABIS.ScoringOracle,
      "finalizeScore",
      [BigInt(tokenId)]
    );
    await result.wait(1);
    return { txHash: result.txHash };
  },

  async challengeScore(tokenId) {
    const result = await ADAPTER.sendTransaction(
      activeChain,
      "ScoringOracle",
      ABIS.ScoringOracle,
      "challengeScore",
      [BigInt(tokenId)]
    );
    await result.wait(1);
    return { txHash: result.txHash };
  },

  // ============== Loan delinquency pokes ==============

  async markLate(loanId) {
    const result = await ADAPTER.sendTransaction(
      activeChain,
      "LoanManager",
      ABIS.LoanManager,
      "markLate",
      [BigInt(loanId)]
    );
    await result.wait(1);
    return { txHash: result.txHash };
  },

  async markDefault(loanId) {
    const result = await ADAPTER.sendTransaction(
      activeChain,
      "LoanManager",
      ABIS.LoanManager,
      "markDefault",
      [BigInt(loanId)]
    );
    await result.wait(1);
    return { txHash: result.txHash };
  },
};
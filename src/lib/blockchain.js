/**
 * Transaction coordinator. Each function:
 *   1. Calls the ACTIVE chain's adapter to submit the user-signed tx
 *   2. Waits for confirmation
 *   3. Notifies the BE (passing ?chain=) so it verifies the receipt
 *      and indexes events into Mongo
 *
 * Chain-aware: the active chain is resolved at call time. If the user switches
 * chains between actions, subsequent calls go to the new chain automatically.
 */

import { ethers } from "ethers";
import { ABIS } from "./abis";
import { getActiveChain } from "./chains";
import { usdcToRaw } from "./format";
import { api } from "./api";

// ----------------------------------------------------------------
// Internals
// ----------------------------------------------------------------

function _chain() {
  return getActiveChain();
}

function _adapter() {
  return _chain().adapter;
}

function _addrs() {
  return _chain().contracts;
}

async function _approveUsdcIfNeeded(owner, spender, amountRaw) {
  const chain = _chain();
  const allowance = await _adapter().readContract(
    chain,
    "USDC",
    ["function allowance(address owner, address spender) external view returns (uint256)"],
    "allowance",
    [owner, spender]
  );
  if (BigInt(allowance) >= BigInt(amountRaw)) return null;

  const result = await _adapter().approveToken(chain, chain.contracts.USDC, spender, amountRaw);
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
    return await api.faucet({ wallet_address: walletAddress, amount_usdc: amountUsdc });
  },

  // ============== Borrow ==============

  async borrow(walletAddress, tokenId, amountUsdc, termDays = 30) {
    _assertConnected(walletAddress);
    if (!tokenId || tokenId === 0) {
      throw new Error("You need a CreditGraph identity first.");
    }
    const amountRaw = usdcToRaw(amountUsdc);
    const result = await _adapter().sendTransaction(
      _chain(), "LoanManager", ABIS.LoanManager, "originate",
      [BigInt(tokenId), amountRaw, BigInt(termDays)]
    );
    const receipt = await result.wait(1);
    const beResponse = await api.borrowFunds({
      wallet_address: walletAddress, tx_hash: result.txHash,
    });
    return { txHash: result.txHash, receipt, ...beResponse };
  },

  // ============== Repay ==============

  async repay(walletAddress, loanId, amountUsdc) {
    _assertConnected(walletAddress);
    const amountRaw = usdcToRaw(amountUsdc);
    await _approveUsdcIfNeeded(walletAddress, _addrs().LoanManager, amountRaw);
    const result = await _adapter().sendTransaction(
      _chain(), "LoanManager", ABIS.LoanManager, "repay",
      [BigInt(loanId), amountRaw]
    );
    await result.wait(1);
    const beResponse = await api.repayLoan({
      wallet_address: walletAddress, tx_hash: result.txHash,
    });
    return { txHash: result.txHash, ...beResponse };
  },

  // ============== Vouch (attest) ==============

  async vouch(walletAddress, subjectTokenId, bondUsdc, durationDays = 90, relType = "AJO") {
    _assertConnected(walletAddress);
    const bondRaw = usdcToRaw(bondUsdc);
    const duration = BigInt(durationDays * 86400);
    const relTypeBytes32 = ethers.encodeBytes32String(relType);
    await _approveUsdcIfNeeded(walletAddress, _addrs().SocialAttestation, bondRaw);
    const result = await _adapter().sendTransaction(
      _chain(), "SocialAttestation", ABIS.SocialAttestation, "attest",
      [BigInt(subjectTokenId), bondRaw, duration, relTypeBytes32]
    );
    await result.wait(1);
    const beResponse = await api.attest({ tx_hash: result.txHash });
    return { txHash: result.txHash, ...beResponse };
  },

  async requestRevoke(attestationId) {
    const result = await _adapter().sendTransaction(
      _chain(), "SocialAttestation", ABIS.SocialAttestation, "requestRevoke",
      [BigInt(attestationId)]
    );
    await result.wait(1);
    const beResponse = await api.revokeAttestation({
      attestation_id: Number(attestationId), tx_hash: result.txHash, action: "request",
    });
    return { txHash: result.txHash, ...beResponse };
  },

  async finalizeRevoke(attestationId) {
    const result = await _adapter().sendTransaction(
      _chain(), "SocialAttestation", ABIS.SocialAttestation, "revoke",
      [BigInt(attestationId)]
    );
    await result.wait(1);
    const beResponse = await api.revokeAttestation({
      attestation_id: Number(attestationId), tx_hash: result.txHash, action: "finalize",
    });
    return { txHash: result.txHash, ...beResponse };
  },

  // ============== Pool (ERC-4626) ==============

  async supply(walletAddress, amountUsdc) {
    _assertConnected(walletAddress);
    const amountRaw = usdcToRaw(amountUsdc);
    await _approveUsdcIfNeeded(walletAddress, _addrs().LendingPool, amountRaw);
    const result = await _adapter().sendTransaction(
      _chain(), "LendingPool", ABIS.LendingPool, "deposit",
      [amountRaw, walletAddress]
    );
    await result.wait(1);
    const beResponse = await api.supply({
      wallet_address: walletAddress, tx_hash: result.txHash,
    });
    return { txHash: result.txHash, ...beResponse };
  },

  async withdraw(walletAddress, amountUsdc) {
    _assertConnected(walletAddress);
    const amountRaw = usdcToRaw(amountUsdc);
    const result = await _adapter().sendTransaction(
      _chain(), "LendingPool", ABIS.LendingPool, "withdraw",
      [amountRaw, walletAddress, walletAddress]
    );
    await result.wait(1);
    const beResponse = await api.withdraw({
      wallet_address: walletAddress, tx_hash: result.txHash,
    });
    return { txHash: result.txHash, ...beResponse };
  },

  // ============== Score pokes ==============

  async finalizeScore(tokenId) {
    const result = await _adapter().sendTransaction(
      _chain(), "ScoringOracle", ABIS.ScoringOracle, "finalizeScore",
      [BigInt(tokenId)]
    );
    await result.wait(1);
    return { txHash: result.txHash };
  },

  async challengeScore(tokenId) {
    const result = await _adapter().sendTransaction(
      _chain(), "ScoringOracle", ABIS.ScoringOracle, "challengeScore",
      [BigInt(tokenId)]
    );
    await result.wait(1);
    return { txHash: result.txHash };
  },

  // ============== Loan delinquency pokes ==============

  async markLate(loanId) {
    const result = await _adapter().sendTransaction(
      _chain(), "LoanManager", ABIS.LoanManager, "markLate",
      [BigInt(loanId)]
    );
    await result.wait(1);
    return { txHash: result.txHash };
  },

  async markDefault(loanId) {
    const result = await _adapter().sendTransaction(
      _chain(), "LoanManager", ABIS.LoanManager, "markDefault",
      [BigInt(loanId)]
    );
    await result.wait(1);
    return { txHash: result.txHash };
  },
};
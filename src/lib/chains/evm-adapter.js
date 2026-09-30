/**
 * EVM adapter — implements the AdapterInterface using ethers.js v6 + MetaMask.
 *
 * The UI never imports ethers directly; it goes through these methods so that
 * a Sui adapter can be added later without UI changes.
 */

import { ethers } from "ethers";

const NOT_INSTALLED = "Wallet not installed";

function _hasWindow() {
  return typeof window !== "undefined";
}

function _eth() {
  if (!_hasWindow() || !window.ethereum) {
    throw new Error(NOT_INSTALLED);
  }
  return window.ethereum;
}

function _getBrowserProvider() {
  return new ethers.BrowserProvider(_eth());
}

async function _getSigner() {
  const provider = _getBrowserProvider();
  return await provider.getSigner();
}

function _readOnlyProvider(chain) {
  return new ethers.JsonRpcProvider(chain.rpcUrl);
}

function _contractRO(chain, contractName, abi) {
  const addr = chain.contracts[contractName];
  if (!addr) throw new Error(`No address for ${contractName} on ${chain.name}`);
  return new ethers.Contract(addr, abi, _readOnlyProvider(chain));
}

async function _contractRW(chain, contractName, abi) {
  const addr = chain.contracts[contractName];
  if (!addr) throw new Error(`No address for ${contractName} on ${chain.name}`);
  const signer = await _getSigner();
  return new ethers.Contract(addr, abi, signer);
}

export const evmAdapter = {
  // ----- Wallet -----

  isWalletInstalled() {
    return _hasWindow() && Boolean(window.ethereum);
  },

  async connect() {
    const accounts = await _eth().request({ method: "eth_requestAccounts" });
    if (!accounts || accounts.length === 0) {
      throw new Error("No account selected");
    }
    return { address: accounts[0] };
  },

  async getConnectedAddress() {
    if (!this.isWalletInstalled()) return null;
    try {
      const accounts = await _eth().request({ method: "eth_accounts" });
      return accounts && accounts.length > 0 ? accounts[0] : null;
    } catch {
      return null;
    }
  },

  async isOnExpectedNetwork(chain) {
    if (!this.isWalletInstalled()) return false;
    try {
      const chainIdHex = await _eth().request({ method: "eth_chainId" });
      return parseInt(chainIdHex, 16) === chain.id;
    } catch {
      return false;
    }
  },

  async switchNetwork(chain) {
    const hex = "0x" + chain.id.toString(16);
    try {
      await _eth().request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hex }],
      });
    } catch (err) {
      // 4902 = chain not added; try adding it
      if (err.code === 4902) {
        await _eth().request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: hex,
            chainName: chain.name,
            nativeCurrency: { name: chain.nativeSymbol, symbol: chain.nativeSymbol, decimals: 18 },
            rpcUrls: [chain.rpcUrl],
            blockExplorerUrls: [chain.explorerUrl],
          }],
        });
      } else {
        throw err;
      }
    }
  },

  // ----- Reads -----

  async getNativeBalance(chain, address) {
    const provider = _readOnlyProvider(chain);
    const wei = await provider.getBalance(address);
    return Number(ethers.formatEther(wei));
  },

  async getTokenBalance(chain, tokenAddress, holder, decimals = 6) {
    const abi = ["function balanceOf(address) view returns (uint256)"];
    const provider = _readOnlyProvider(chain);
    const c = new ethers.Contract(tokenAddress, abi, provider);
    const raw = await c.balanceOf(holder);
    return {
      raw,
      formatted: Number(ethers.formatUnits(raw, decimals)),
    };
  },

  async readContract(chain, contractName, abi, fnName, args = []) {
    const c = _contractRO(chain, contractName, abi);
    return await c[fnName](...args);
  },

  // ----- Writes -----

  async sendTransaction(chain, contractName, abi, fnName, args = [], options = {}) {
    const c = await _contractRW(chain, contractName, abi);
    const tx = await c[fnName](...args, options);
    return {
      txHash: tx.hash,
      wait: async (confirmations = 1) => {
        const receipt = await tx.wait(confirmations);
        if (receipt.status !== 1) throw new Error(`Tx reverted: ${tx.hash}`);
        return receipt;
      },
    };
  },

  async approveToken(chain, tokenAddress, spender, amountRaw) {
    const abi = ["function approve(address,uint256) returns (bool)"];
    const signer = await _getSigner();
    const c = new ethers.Contract(tokenAddress, abi, signer);
    const tx = await c.approve(spender, amountRaw);
    return {
      txHash: tx.hash,
      wait: async (confirmations = 1) => {
        const receipt = await tx.wait(confirmations);
        if (receipt.status !== 1) throw new Error(`Approve reverted: ${tx.hash}`);
        return receipt;
      },
    };
  },

  // ----- Subscriptions -----

  onAccountChange(callback) {
    if (!this.isWalletInstalled()) return () => {};
    const handler = (accounts) => callback(accounts[0] || null);
    _eth().on("accountsChanged", handler);
    return () => _eth().removeListener("accountsChanged", handler);
  },

  onChainChange(callback) {
    if (!this.isWalletInstalled()) return () => {};
    const handler = (chainIdHex) => callback(parseInt(chainIdHex, 16));
    _eth().on("chainChanged", handler);
    return () => _eth().removeListener("chainChanged", handler);
  },
};
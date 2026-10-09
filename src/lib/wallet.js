/**
 * Wallet service. UI imports this; it dispatches to the ACTIVE chain's adapter.
 *
 * Chain-aware: every call reads `getActiveChain()` at invocation time, so when
 * ChainProvider switches chains, the next wallet call targets the new chain
 * without any component change.
 *
 * Adding SUI = add a sui-adapter, hydrate it into the registry; this file
 * doesn't change.
 */

import { getActiveChain, CHAIN_KIND } from "./chains";

export { getActiveChain as activeChain }; // compatibility shim for legacy imports

function _chain() {
  return getActiveChain();
}

function _adapter() {
  return _chain().adapter;
}

export const wallet = {
  isInstalled() {
    try {
      return _adapter().isWalletInstalled();
    } catch {
      // Registry not hydrated yet
      return typeof window !== "undefined" && Boolean(window.ethereum);
    }
  },

  async connect() {
    return await _adapter().connect();
  },

  async currentAddress() {
    try {
      return await _adapter().getConnectedAddress();
    } catch {
      return null;
    }
  },

  async isOnCorrectNetwork() {
    return await _adapter().isOnExpectedNetwork(_chain());
  },

  async switchToCorrectNetwork() {
    await _adapter().switchNetwork(_chain());
  },

  async getNativeBalance(address) {
    return await _adapter().getNativeBalance(_chain(), address);
  },

  async getUsdcBalance(address) {
    const chain = _chain();
    return await _adapter().getTokenBalance(chain, chain.contracts.USDC, address, 6);
  },

  onAccountChange(callback) {
    return _adapter().onAccountChange(callback);
  },

  onChainChange(callback) {
    return _adapter().onChainChange(callback);
  },
};
/**
 * Wallet service. UI imports this; it dispatches to the active chain's adapter.
 * Adding SUI = swap which adapter handles it; this file doesn't change.
 */

import { getDefaultChain, CHAIN_KIND } from "./chains";

const CHAIN = getDefaultChain();
const ADAPTER = CHAIN.adapter;

export { CHAIN as activeChain };

export const wallet = {
  isInstalled() {
    return ADAPTER.isWalletInstalled();
  },

  async connect() {
    return await ADAPTER.connect();
  },

  async currentAddress() {
    return await ADAPTER.getConnectedAddress();
  },

  async isOnCorrectNetwork() {
    return await ADAPTER.isOnExpectedNetwork(CHAIN);
  },

  async switchToCorrectNetwork() {
    await ADAPTER.switchNetwork(CHAIN);
  },

  async getNativeBalance(address) {
    return await ADAPTER.getNativeBalance(CHAIN, address);
  },

  async getUsdcBalance(address) {
    return await ADAPTER.getTokenBalance(CHAIN, CHAIN.contracts.USDC, address, 6);
  },

  onAccountChange(callback) {
    return ADAPTER.onAccountChange(callback);
  },

  onChainChange(callback) {
    return ADAPTER.onChainChange(callback);
  },
};
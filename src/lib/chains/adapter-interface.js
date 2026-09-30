/**
 * Adapter interface. Every chain adapter must export an object with these
 * methods. The UI/services layer calls these — never reaches into ethers,
 * web3.js, or sui.js directly.
 *
 * This file is documentation. The actual adapters (evm-adapter.js,
 * future sui-adapter.js) implement these methods.
 */

/* eslint-disable no-unused-vars */

export const AdapterInterface = {
  /**
   * Check if a wallet provider is installed (MetaMask / Sui Wallet etc).
   * Returns boolean.
   */
  isWalletInstalled() {},

  /**
   * Request wallet connection. Returns { address }.
   */
  async connect() {},

  /**
   * Get the currently connected address, or null.
   */
  async getConnectedAddress() {},

  /**
   * Check the wallet's current network matches `chain.id`. Returns boolean.
   */
  async isOnExpectedNetwork(chain) {},

  /**
   * Ask the wallet to switch to a chain. EVM does this via wallet_switchEthereumChain.
   */
  async switchNetwork(chain) {},

  /**
   * Read native balance (ETH on EVM, SUI on Sui). Returns Number (decimal).
   */
  async getNativeBalance(chain, address) {},

  /**
   * Read an ERC-20-like token balance. Returns { raw: bigint, formatted: number }.
   */
  async getTokenBalance(chain, tokenAddress, holder, decimals) {},

  /**
   * Read a contract view function. Returns the function's return value.
   * Args: chain, contractName (key in chain.contracts), abi, fnName, args[]
   */
  async readContract(chain, contractName, abi, fnName, args) {},

  /**
   * Send a write transaction. Returns { txHash, wait() }.
   */
  async sendTransaction(chain, contractName, abi, fnName, args, options) {},

  /**
   * Approve token spending. Returns { txHash, wait() }.
   * EVM: ERC-20 approve. SUI: equivalent object permission.
   */
  async approveToken(chain, tokenAddress, spender, amountRaw) {},

  /**
   * Subscribe to wallet account / network changes. Returns an unsubscribe fn.
   */
  onAccountChange(callback) {},
  onChainChange(callback) {},
};
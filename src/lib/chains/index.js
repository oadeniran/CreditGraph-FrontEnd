/**
 * Chain registry. Runtime-hydrated from the BE's /api/chains endpoint.
 *
 * The UI never hardcodes chain data — it waits for `ChainProvider` to fetch
 * the registry on mount, then reads via useChain() or getActiveChain().
 *
 * Chain keys are snake_case to match the BE (e.g. "arbitrum_sepolia").
 *
 * To add a new chain, deploy its contracts, add the addresses to the BE's .env,
 * restart BE. FE picks them up on next page load — zero FE code change.
 */

import { evmAdapter } from "./evm-adapter";

export const CHAIN_KIND = {
  EVM: "evm",
  SUI: "sui", // future
};

// ----------------------------------------------------------------
// Internal state — the registry is populated by ChainProvider after fetch
// ----------------------------------------------------------------

let _CHAINS = {};              // snake_case key → chain object
let _DEFAULT_KEY = null;        // from BE
let _ACTIVE_KEY = null;         // currently selected by user
let _READY = false;             // true after first successful fetch
const _subscribers = new Set(); // chain-change subscribers

function _notify() {
  for (const sub of _subscribers) {
    try { sub(); } catch (e) { console.error("chain subscriber error", e); }
  }
}

// ----------------------------------------------------------------
// Hydration — called once by ChainProvider on mount
// ----------------------------------------------------------------

/**
 * Takes the raw /api/chains response and builds the FE-side registry.
 * Attaches the appropriate adapter to each chain based on its kind.
 */
export function hydrateChains(apiResponse) {
  const chains = {};
  for (const c of apiResponse.chains || []) {
    chains[c.key] = {
      key: c.key,
      id: c.chain_id,
      name: c.name,
      kind: CHAIN_KIND.EVM, // all BE chains are EVM for now
      adapter: evmAdapter,
      rpcUrl: c.rpc_url || null,       // BE doesn't send this today; adapter uses MetaMask's RPC
      explorerUrl: c.explorer_url || "",
      nativeSymbol: c.native_symbol || "ETH",
      isTestnet: c.is_testnet !== false,
      contracts: c.contracts || {},
    };
  }
  _CHAINS = chains;
  _DEFAULT_KEY = apiResponse.default || Object.keys(chains)[0] || null;
  _READY = true;
  _notify();
}

export function isChainRegistryReady() {
  return _READY;
}

// ----------------------------------------------------------------
// Read access
// ----------------------------------------------------------------

export function listChains() {
  return Object.values(_CHAINS);
}

export function getChain(key) {
  const chain = _CHAINS[key];
  if (!chain) {
    throw new Error(`Unknown chain: ${key}. Available: ${Object.keys(_CHAINS).join(", ") || "(registry empty)"}`);
  }
  return chain;
}

export function getDefaultChainKey() {
  return _DEFAULT_KEY;
}

export function getActiveChainKey() {
  return _ACTIVE_KEY || _DEFAULT_KEY;
}

export function getActiveChain() {
  const key = getActiveChainKey();
  if (!key) throw new Error("Chain registry not hydrated yet");
  return getChain(key);
}

// ----------------------------------------------------------------
// Write access — only called by ChainProvider / useChainSwitcher
// ----------------------------------------------------------------

export function setActiveChainKey(key) {
  if (!_CHAINS[key]) {
    throw new Error(`Cannot activate unknown chain: ${key}`);
  }
  if (_ACTIVE_KEY === key) return;
  _ACTIVE_KEY = key;
  _notify();
}

export function subscribeToChainChanges(callback) {
  _subscribers.add(callback);
  return () => _subscribers.delete(callback);
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/**
 * Builds an explorer URL for a tx hash, address, or token.
 * Returns empty string if no explorer configured.
 */
export function explorerLink(chainKey, type, value) {
  const chain = _CHAINS[chainKey];
  if (!chain || !chain.explorerUrl) return "";
  if (chain.kind === CHAIN_KIND.EVM) {
    if (type === "tx") return `${chain.explorerUrl}/tx/${value}`;
    if (type === "address") return `${chain.explorerUrl}/address/${value}`;
    if (type === "token") return `${chain.explorerUrl}/token/${value}`;
  }
  return chain.explorerUrl;
}

// ----------------------------------------------------------------
// Deprecated — kept temporarily so existing code that references these
// won't crash while we migrate. Will remove in Part 7.
// ----------------------------------------------------------------

export const CHAINS = new Proxy({}, {
  get(_, key) {
    console.warn(
      `Deprecated: CHAINS["${String(key)}"] accessed directly. ` +
      `Use useChain() / getActiveChain() / getChain(key) instead.`
    );
    return _CHAINS[key];
  },
});

export const DEFAULT_CHAIN_KEY = new Proxy({}, {
  get() {
    console.warn("Deprecated: use getDefaultChainKey() instead");
    return _DEFAULT_KEY;
  },
});
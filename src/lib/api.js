/**
 * Single typed-ish wrapper for all BE calls. UI never builds URLs itself.
 *
 * Every call automatically appends ?chain=<active_chain_key> except for a
 * handful of truly chain-agnostic endpoints (health, chain registry, reason
 * payloads keyed by hash). The active chain is read from the chain registry
 * at call time, so swapping chains in the UI immediately changes which
 * backend state each call targets.
 */

import { API_URL } from "./config";
import { getActiveChainKey } from "./chains";

// ----------------------------------------------------------------
// Internals
// ----------------------------------------------------------------

/**
 * Appends `?chain=<key>` (or `&chain=<key>` if the endpoint already has a
 * query string) to any endpoint. Pass includeChain=false for chain-agnostic
 * endpoints like /api/health, /api/chains, /api/score/reason/:hash.
 */
function _withChain(endpoint, includeChain = true) {
  if (!includeChain) return endpoint;
  let key;
  try {
    key = getActiveChainKey();
  } catch {
    // Registry not hydrated — let the request go without ?chain and BE will
    // use its default. Should only happen on very first page load.
    return endpoint;
  }
  if (!key) return endpoint;
  const sep = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${sep}chain=${encodeURIComponent(key)}`;
}

async function _fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = { "Content-Type": "application/json", ...options.headers };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API ${res.status}: ${endpoint}`);
  }
  return res.json();
}

const _postChained = (endpoint, body) =>
  _fetchAPI(_withChain(endpoint), { method: "POST", body: JSON.stringify(body) });

const _getChained = (endpoint) =>
  _fetchAPI(_withChain(endpoint), { method: "GET" });

const _postRaw = (endpoint, body) =>
  _fetchAPI(endpoint, { method: "POST", body: JSON.stringify(body) });

const _getRaw = (endpoint) =>
  _fetchAPI(endpoint, { method: "GET" });

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

export const api = {
  // ----- Chain-agnostic -----
  health: () => _getRaw(`/api/health`),
  listChains: () => _getRaw(`/api/chains`),
  getScoreReason: (hash) => _getRaw(`/api/score/reason/${hash}`),

  // ----- Identity -----
  onboardUser: (walletAddress) =>
    _postChained(`/api/onboard`, { wallet_address: walletAddress }),
  mintIdentity: (walletAddress, metadataHash) =>
    _postChained(`/api/identity/mint`, { wallet_address: walletAddress, metadata_hash: metadataHash }),
  getIdentity: (walletAddress) => _getChained(`/api/identity/${walletAddress}`),

  // ----- Dashboard -----
  getUserDashboard: (walletAddress) => _getChained(`/api/user/${walletAddress}`),

  // ----- Scoring -----
  underwrite: (walletAddress) =>
    _postChained(`/api/score/underwrite`, { wallet_address: walletAddress }),
  finalizeScoreOnchain: (tokenId) =>
    _postChained(`/api/score/finalize`, { token_id: tokenId }),
  challengeScoreOnchain: (tokenId) =>
    _postChained(`/api/score/challenge`, { token_id: tokenId }),
  getPendingScore: (tokenId) => _getChained(`/api/score/pending/${tokenId}`),

  // ----- Loans -----
  borrowFunds: (payload) => _postChained(`/api/borrow`, payload),
  repayLoan: (payload) => _postChained(`/api/repay`, payload),
  markLate: (loanId) => _postChained(`/api/loan/mark-late`, { loan_id: loanId }),
  markDefault: (loanId) => _postChained(`/api/loan/mark-default`, { loan_id: loanId }),
  getLoan: (loanId) => _getChained(`/api/loan/${loanId}`),
  getLoanHistory: (walletAddress, page = 1, size = 5) =>
    _getChained(`/api/user/${walletAddress}/loans?page=${page}&size=${size}`),

  // ----- Attestations -----
  attest: (payload) => _postChained(`/api/attest`, payload),
  revokeAttestation: (payload) => _postChained(`/api/attest/revoke`, payload),
  getAttestation: (attestationId) => _getChained(`/api/attestation/${attestationId}`),
  getAttestationHistory: (walletAddress, page = 1, size = 5, role = "given") =>
    _getChained(`/api/user/${walletAddress}/attestations?page=${page}&size=${size}&role=${role}`),

  // ----- Pool -----
  supply: (payload) => _postChained(`/api/pool/supply`, payload),
  withdraw: (payload) => _postChained(`/api/pool/withdraw`, payload),
  getPoolStats: () => _getChained(`/api/pool/stats`),
  getPoolBalance: (walletAddress) => _getChained(`/api/pool/balance/${walletAddress}`),
  getRateCurves: () => _getChained(`/api/pool/rates`),
  getAprPreview: (tier, utilizationBps = 0) =>
    _getChained(`/api/pool/apr-preview?tier=${tier}&utilization_bps=${utilizationBps}`),

  // ----- Market -----
  getMarketOverview: () => _getChained(`/api/market/overview`),
  getInsuranceState: () => _getChained(`/api/market/insurance`),
  getTreasuryState: () => _getChained(`/api/market/treasury`),

  // ----- Agents -----
  getAgents: () => _getChained(`/api/agents`),

  // ----- x402 -----
  demoOpenChannel: () => _postChained(`/api/x402/demo-open`, {}),
  demoSettleChannel: (channelId, cumulativeAmountRaw) =>
    _postChained(`/api/x402/demo-settle`, { channel_id: channelId, cumulative_amount: cumulativeAmountRaw }),
  listChannels: () => _getChained(`/api/x402/channels`),

  // ----- Admin / faucet -----
  faucet: (payload) => _postChained(`/api/faucet`, payload),
};
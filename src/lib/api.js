/**
 * Single typed-ish wrapper for all BE calls. UI never builds URLs itself.
 */

import { API_URL } from "./config";

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = { "Content-Type": "application/json", ...options.headers };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API ${res.status}: ${endpoint}`);
  }
  return res.json();
}

const post = (endpoint, body) =>
  fetchAPI(endpoint, { method: "POST", body: JSON.stringify(body) });

const get = (endpoint) => fetchAPI(endpoint, { method: "GET" });

export const api = {
  // Health
  health: () => get(`/api/health`),

  // Identity
  onboardUser: (walletAddress) => post(`/api/onboard`, { wallet_address: walletAddress }),
  mintIdentity: (walletAddress, metadataHash) =>
    post(`/api/identity/mint`, { wallet_address: walletAddress, metadata_hash: metadataHash }),
  getIdentity: (walletAddress) => get(`/api/identity/${walletAddress}`),

  // Dashboard
  getUserDashboard: (walletAddress) => get(`/api/user/${walletAddress}`),

  // Scoring
  underwrite: (walletAddress) => post(`/api/score/underwrite`, { wallet_address: walletAddress }),
  finalizeScoreOnchain: (tokenId) => post(`/api/score/finalize`, { token_id: tokenId }),
  challengeScoreOnchain: (tokenId) => post(`/api/score/challenge`, { token_id: tokenId }),
  getPendingScore: (tokenId) => get(`/api/score/pending/${tokenId}`),
  getScoreReason: (hash) => get(`/api/score/reason/${hash}`),

  // Loans
  borrowFunds: (payload) => post(`/api/borrow`, payload),
  repayLoan: (payload) => post(`/api/repay`, payload),
  markLate: (loanId) => post(`/api/loan/mark-late`, { loan_id: loanId }),
  markDefault: (loanId) => post(`/api/loan/mark-default`, { loan_id: loanId }),
  getLoan: (loanId) => get(`/api/loan/${loanId}`),
  getLoanHistory: (walletAddress, page = 1, size = 5) =>
    get(`/api/user/${walletAddress}/loans?page=${page}&size=${size}`),

  // Attestations
  attest: (payload) => post(`/api/attest`, payload),
  revokeAttestation: (payload) => post(`/api/attest/revoke`, payload),
  getAttestation: (attestationId) => get(`/api/attestation/${attestationId}`),
  getAttestationHistory: (walletAddress, page = 1, size = 5, role = "given") =>
    get(`/api/user/${walletAddress}/attestations?page=${page}&size=${size}&role=${role}`),

  // Pool
  supply: (payload) => post(`/api/pool/supply`, payload),
  withdraw: (payload) => post(`/api/pool/withdraw`, payload),
  getPoolStats: () => get(`/api/pool/stats`),
  getPoolBalance: (walletAddress) => get(`/api/pool/balance/${walletAddress}`),
  getRateCurves: () => get(`/api/pool/rates`),
  getAprPreview: (tier, utilizationBps = 0) =>
    get(`/api/pool/apr-preview?tier=${tier}&utilization_bps=${utilizationBps}`),

  // Market
  getMarketOverview: () => get(`/api/market/overview`),
  getInsuranceState: () => get(`/api/market/insurance`),
  getTreasuryState: () => get(`/api/market/treasury`),

  // Agents
  getAgents: () => get(`/api/agents`),

  // x402
  demoOpenChannel: () => post(`/api/x402/demo-open`, {}),
  demoSettleChannel: (channelId, cumulativeAmountRaw) =>
    post(`/api/x402/demo-settle`, { channel_id: channelId, cumulative_amount: cumulativeAmountRaw }),
  listChannels: () => get(`/api/x402/channels`),

  // Admin / faucet
  faucet: (payload) => post(`/api/faucet`, payload),
};
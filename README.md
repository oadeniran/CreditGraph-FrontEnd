# CreditGraph Frontend

Next.js 16 + wagmi/viem-lite (via a custom EVM adapter) mobile-first app for the CreditGraph protocol.

**Live:** [Link](https://creditgraph-fe-9a4ee699162b.herokuapp.com/) · **Main repo:** [Link](https://github.com/oadeniran/creditGraph) · **Backend:** [Link](https://github.com/oadeniran/CreditGraph-BackEnd)

## What it is

A production-ready client for the CreditGraph protocol — six tabs, real MetaMask transactions on Arbitrum Sepolia, a full transaction state machine, and a chain-adapter abstraction that lets us add SUI or any other chain later without rewriting the UI.

## Features

- **Wallet onboarding** — MetaMask connect → auto-switch to Arbitrum Sepolia → mint soulbound identity → agent quorum computes first score
- **Home tab** — credit limit, current tier, active loans with live outstanding, pending-score countdown + finalize
- **Pool tab** — ERC-4626 supply/withdraw, cgUSDC share tracking, utilization gauge with kink marker
- **Vouch tab** — attest a bond on someone, manage your active vouches, two-step revoke with cooldown
- **Market tab** — TVL, kinked APR curve visualization, treasury splits, insurance state, the underwriter agent network with stake, x402 agent-to-agent payment demo
- **History tab** — paginated loans + attestations backed by the BE event indexer
- **Profile tab** — score breakdown ("Why this score?"), graduation progress ("N more on-time repayments → Tier X+1")

## Architecture

```
┌────────────────────────────────────────────────┐
│                  UI (React)                    │
│  Home  Pool  Vouch  Market  History  Profile   │
└────────────────────────┬───────────────────────┘
                         │
┌────────────────────────▼───────────────────────┐
│               Wallet + Blockchain              │
│    tx state machine · toast system · refetch   │
└────────────────────────┬───────────────────────┘
                         │
┌────────────────────────▼───────────────────────┐
│               Chain adapter layer              │
│    lib/chains/index.js  → evm-adapter (now)    │
│                         → sui-adapter (later)  │
└────────────┬──────────────────────┬────────────┘
             │                      │
      ┌──────▼──────┐         ┌─────▼─────┐
      │  MetaMask   │         │    BE     │
      │ signs txs   │         │  reads +  │
      └─────────────┘         │  verifies │
                              └───────────┘
```

The UI never imports `ethers` directly — everything flows through the chain adapter. Adding SUI later means implementing one interface, not touching the UI.

## Running locally

**Prerequisites:** Node 18+, a running backend, MetaMask.

```bash
git clone <TODO>
cd creditgraph-frontend

npm install

# Configure
cp .env.local.example .env.local
# Edit .env.local — point NEXT_PUBLIC_API_URL at your backend

npm run dev
```

Open `http://localhost:3000`.

## Environment variables

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8005` |

Contract addresses are baked into `lib/chains/index.js` (Arbitrum Sepolia). To point at a different deployment, edit that file.

## Key files

| File | Purpose |
|---|---|
| `lib/chains/index.js` | Chain registry (addresses, RPC, adapter) — add new chains here |
| `lib/chains/evm-adapter.js` | EVM implementation of the adapter interface |
| `lib/chains/adapter-interface.js` | Documented adapter interface (for adding new chains) |
| `lib/abis.js` | Minimal ABIs for functions the FE signs via MetaMask |
| `lib/wallet.js` | Wallet service — network guard, connect, balances |
| `lib/blockchain.js` | Transaction coordinator — real txs only, no mock fallbacks |
| `lib/api.js` | Typed wrapper over the backend |
| `lib/format.js` | USDC / bps / address / countdown formatting |
| `lib/toast.js` | Toast notification system |
| `lib/useTxFlow.js` | Transaction state machine hook |
| `lib/useChainData.js` | SWR-lite for BE reads with polling + refetch |
| `components/TxModal.js` | Approve → sign → confirm → index → done modal |
| `components/NetworkGuard.js` | Sticky banner if user is on the wrong network |
| `components/X402DemoWidget.js` | Agent-to-agent micropayment demo |
| `app/dashboard/tabs/*` | The six tabs |

## Design choices

- **No `alert()`, no `window.location.reload()`** — every action goes through the tx state machine + refetch pattern
- **Skeleton loaders**, not text spinners
- **Polling every 10s** for on-chain state — plus immediate refetch after every tx
- **Chain-agnostic UI** — every EVM-specific call goes through the adapter
- **Real errors surfaced** — no silent mocks; contract reverts show friendly messages (`0xa17e11d5` → "Pool doesn't have enough liquidity")

## Stack

- Next.js 16 (App Router, Turbopack)
- ethers.js 6 (behind the adapter)
- Pure CSS (no Tailwind, no design lib) — keeps bundle small and mobile-first
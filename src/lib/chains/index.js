/**
 * Chain registry. Single source of truth for what chains we support, how to
 * connect to them, and which contracts live on each. The UI imports from
 * here, NEVER from a specific chain's adapter.
 *
 * To add SUI later:
 *   1. Create lib/chains/sui-adapter.js implementing the same interface
 *   2. Add a SUI entry to CHAINS below
 *   3. UI continues to work unchanged
 */

import { evmAdapter } from "./evm-adapter";

export const CHAIN_KIND = {
  EVM: "evm",
  SUI: "sui", // future
};

/**
 * Each chain entry must expose:
 *   id            : numeric chain ID (EVM) or network name (non-EVM)
 *   name          : human-readable
 *   kind          : CHAIN_KIND.*
 *   adapter       : the adapter implementing the interface (see evm-adapter.js)
 *   rpcUrl        : public RPC
 *   explorerUrl   : block explorer base URL
 *   nativeSymbol  : ETH / SUI / etc.
 *   contracts     : { name -> address }
 *   isTestnet     : bool
 */
export const CHAINS = {
  arbitrumSepolia: {
    id: 421614,
    name: "Arbitrum Sepolia",
    kind: CHAIN_KIND.EVM,
    adapter: evmAdapter,
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    explorerUrl: "https://sepolia.arbiscan.io",
    nativeSymbol: "ETH",
    isTestnet: true,
    contracts: {
      USDC: "0x539dB5ce86e19C06dE61E158Cf7Fe721436B59A1",
      AccessController: "0x8B22193E104Da3A651A560E34573e77D5Da4192C",
      CreditIdentity: "0x2e71F48f3ddd4F52a094F189644b8f03Fb26B9A5",
      ScoreRegistry: "0x7cb5Fa19CF618efD9593Cd3cca8fD74e889e0325",
      ScoringOracle: "0x27646d51736DA24FFC25ba3397E83B5d34F5D487",
      ZKAttestationVerifier: "0xF059d67EA5Df0E050252dd7652E1A9B9C8aD2C1E",
      DataOracleAdapter: "0xc585585A0EF9DEEA7320896CDb18a3221DFb3489",
      AgentRegistry: "0x0e469D811BC2fC224ebF68A617e8F1Ca1298322C",
      X402PaymentRouter: "0x6baD2dd649c97B54b78076E698164A2eDE3e9b7c",
      RepaymentGraduation: "0xFb17643868D400f6E9e1982cEc24e800F3053965",
      SocialAttestation: "0x335Db8BdEd69974495f8ce01dCD0959bca4b14E5",
      InterestRateModel: "0x2Bb87fc28578C258e0C50d49B4ABB9589E93a68D",
      CreditLimitEngine: "0x680488Fdb8A0c692E35e810c58b16d80D1FCE303",
      LendingPool: "0x99e27AE174681a7eb1A1beb02E95E233D36fa948",
      LoanManager: "0x523db7621633B0AB68c74F537f0186c51aa5Cf6A",
      InsuranceFund: "0x56149E26aD1E4CADC2994833770A687838B3F0A6",
      CreditSlasher: "0x6eF952e65E6b3aaE522b19DDABC3bFa902d0C8E1",
      Treasury: "0xcE5624887cdb378c64e23b64E5Fb5B1f9159F985",
    },
  },

  // Future:
  // robinhoodTestnet: { id: 46630, kind: CHAIN_KIND.EVM, ... },
  // suiTestnet: { id: "sui:testnet", kind: CHAIN_KIND.SUI, adapter: suiAdapter, ... },
};

export const DEFAULT_CHAIN_KEY = "arbitrumSepolia";

export function getChain(key = DEFAULT_CHAIN_KEY) {
  const chain = CHAINS[key];
  if (!chain) throw new Error(`Unknown chain: ${key}`);
  return chain;
}

export function getDefaultChain() {
  return getChain(DEFAULT_CHAIN_KEY);
}

/**
 * Builds an Arbiscan/SUI-explorer URL for any address or tx hash on a chain.
 */
export function explorerLink(chainKey, type, value) {
  const chain = getChain(chainKey);
  if (chain.kind === CHAIN_KIND.EVM) {
    if (type === "tx") return `${chain.explorerUrl}/tx/${value}`;
    if (type === "address") return `${chain.explorerUrl}/address/${value}`;
    if (type === "token") return `${chain.explorerUrl}/token/${value}`;
  }
  return chain.explorerUrl;
}
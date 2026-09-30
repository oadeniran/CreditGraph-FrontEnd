/**
 * Minimal ABIs for the functions the FE invokes via MetaMask.
 * Read-only chain queries should go through the BE which has the full ABIs.
 */

export const ABIS = {
  USDC: [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address owner) external view returns (uint256)",
    "function faucet(uint256 amount) external",
  ],

  CreditIdentity: [
    "function tokenIdOf(address user) external view returns (uint256)",
    "function exists(uint256 tokenId) external view returns (bool)",
  ],

  LoanManager: [
    "function originate(uint256 tokenId, uint256 amount, uint64 termDays) external returns (uint256)",
    "function repay(uint256 loanId, uint256 amount) external",
    "function markLate(uint256 loanId) external",
    "function markDefault(uint256 loanId) external",
    "function computeOutstanding(uint256 loanId) external view returns (uint256)",
    "event LoanOriginated(uint256 indexed loanId, uint256 indexed tokenId, uint256 amount, uint16 aprBps, uint64 dueAt)",
    "event LoanRepaid(uint256 indexed loanId, uint256 principalPaid, uint256 interestPaid, bool fullyRepaid)",
  ],

  LendingPool: [
    "function deposit(uint256 assets, address receiver) external returns (uint256)",
    "function withdraw(uint256 assets, address receiver, address owner) external returns (uint256)",
    "function balanceOf(address) external view returns (uint256)",
    "function convertToAssets(uint256 shares, address owner) external view returns (uint256)",
  ],

  SocialAttestation: [
    "function attest(uint256 subjectTokenId, uint256 bondAmount, uint64 duration, bytes32 relType) external returns (uint256)",
    "function requestRevoke(uint256 attestationId) external",
    "function revoke(uint256 attestationId) external",
    "event Attested(uint256 indexed attestationId, uint256 indexed attesterTokenId, uint256 indexed subjectTokenId, uint256 bondAmount, bytes32 relationshipType)",
  ],

  ScoringOracle: [
    "function finalizeScore(uint256 tokenId) external",
    "function challengeScore(uint256 tokenId) external",
  ],

  X402PaymentRouter: [
    "function openChannel(address payee, uint256 deposit, uint64 duration) external returns (bytes32)",
    "function closeChannel(bytes32 channelId) external",
  ],
};
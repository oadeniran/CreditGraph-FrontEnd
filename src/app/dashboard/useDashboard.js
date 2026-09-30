"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { wallet } from "@/lib/wallet";
import { txCoordinator } from "@/lib/blockchain";
import { useTxFlow } from "@/lib/useTxFlow";
import { useChainData } from "@/lib/useChainData";
import { toast } from "@/lib/toast";

export function useDashboard() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState(null);
  const [bootError, setBootError] = useState(null);

  // ----- Wallet handshake -----
  useEffect(() => {
    const stored = typeof window !== "undefined" && localStorage.getItem("wallet_address");
    if (!stored) {
      router.push("/");
      return;
    }
    setWalletAddress(stored);

    // Listen for account changes — if user switches accounts, redirect to landing
    const unsub = wallet.onAccountChange((addr) => {
      if (!addr) {
        localStorage.removeItem("wallet_address");
        router.push("/");
        return;
      }
      if (addr.toLowerCase() !== stored.toLowerCase()) {
        localStorage.setItem("wallet_address", addr);
        window.location.reload(); // Different account = different identity
      }
    });
    return () => unsub && unsub();
  }, [router]);

  // ----- Dashboard data (chain-backed, polls every 20s for live state) -----
  const {
    data: user,
    loading,
    error,
    refetch,
  } = useChainData(
    () => api.getUserDashboard(walletAddress),
    [walletAddress],
    { enabled: Boolean(walletAddress), pollMs: 100_000 }
  );

  // ----- UI state -----
  const [activeTab, setActiveTab] = useState("dashboard");
  const [historyView, setHistoryView] = useState("loans");
  const [activeModal, setActiveModal] = useState(null);
  const [amount, setAmount] = useState("");
  const [targetAddress, setTargetAddress] = useState("");
  const [selectedLoan, setSelectedLoan] = useState(null);

  // ----- Paginated history -----
  const [fullLoans, setFullLoans] = useState({ items: [], total_pages: 1, current_page: 1 });
  const [fullAttestations, setFullAttestations] = useState({ items: [], total_pages: 1, current_page: 1 });
  const [loanPage, setLoanPage] = useState(1);
  const [attestPage, setAttestPage] = useState(1);

  useEffect(() => {
    if (activeTab === "history" && historyView === "loans" && walletAddress) {
      api.getLoanHistory(walletAddress, loanPage, 5)
        .then(setFullLoans)
        .catch((e) => console.error(e));
    }
  }, [activeTab, historyView, loanPage, walletAddress]);

  useEffect(() => {
    if (activeTab === "history" && historyView === "attestations" && walletAddress) {
      // Default to "given" attestations; the UI can flip role later
      api.getAttestationHistory(walletAddress, attestPage, 5, "given")
        .then(setFullAttestations)
        .catch((e) => console.error(e));
    }
  }, [activeTab, historyView, attestPage, walletAddress]);

  const goToHistory = (view) => {
    setHistoryView(view);
    setLoanPage(1);
    setAttestPage(1);
    setActiveTab("history");
  };

  // ----- Tx state machine -----
  const tx = useTxFlow();

  const closeTxModal = () => {
    tx.reset();
    refetch();
  };

  // ----- Action handlers -----

  const handleBorrow = async () => {
    if (!user || !amount) return;
    const amt = parseFloat(amount);
    if (amt <= 0 || amt > user.headroom_usdc) {
      toast.error("Invalid amount", `Headroom is $${user.headroom_usdc.toFixed(2)}`);
      return;
    }
    setActiveModal(null);

    await tx.run({
      title: `Borrow $${amt}`,
      needsApproval: false,
      steps: [
        { stage: "signing", fn: () => Promise.resolve() }, // visual cue before MetaMask
        {
          stage: "confirming",
          fn: async () => {
            return await txCoordinator.borrow(walletAddress, user.token_id, amt, 30);
          },
        },
        { stage: "indexing", fn: () => new Promise((r) => setTimeout(r, 800)) },
      ],
      successMessage: `$${amt} USDC sent to your wallet.`,
    }).catch(() => {});
  };

  const handleRepay = async () => {
    if (!selectedLoan || !amount) return;
    const amt = parseFloat(amount);
    setActiveModal(null);

    await tx.run({
      title: `Repay $${amt}`,
      needsApproval: true,
      steps: [
        {
          stage: "approving",
          fn: () => Promise.resolve(), // Approval happens inside repay() if needed
        },
        {
          stage: "confirming",
          fn: async () => await txCoordinator.repay(walletAddress, selectedLoan, amt),
        },
        { stage: "indexing", fn: () => new Promise((r) => setTimeout(r, 800)) },
      ],
      successMessage: "Repayment confirmed.",
    }).catch(() => {});
  };

  const handleVouch = async () => {
    if (!amount || !targetAddress) return;
    const amt = parseFloat(amount);
    setActiveModal(null);

    try {
      // Resolve subject_token_id from target wallet
      const subj = await api.getIdentity(targetAddress);
      if (!subj.has_identity) {
        toast.error("No identity found", "That wallet hasn't onboarded yet.");
        return;
      }

      await tx.run({
        title: `Vouch $${amt}`,
        needsApproval: true,
        steps: [
          { stage: "approving", fn: () => Promise.resolve() },
          {
            stage: "confirming",
            fn: async () => await txCoordinator.vouch(walletAddress, subj.token_id, amt),
          },
          { stage: "indexing", fn: () => new Promise((r) => setTimeout(r, 800)) },
        ],
        successMessage: `Vouched for ${targetAddress.slice(0, 6)}…`,
      }).catch(() => {});
    } catch (e) {
      toast.error("Vouch failed", e.message);
    }
  };

  const handleFaucet = async () => {
    if (!walletAddress) return;
    try {
      toast.info("Requesting USDC", "Admin minting 100 test USDC to your wallet...");
      await txCoordinator.faucet(walletAddress, 100);
      toast.success("Received 100 USDC", "Test funds are in your wallet.");
      refetch();
    } catch (e) {
      toast.error("Faucet failed", e.message);
    }
  };

  const handleFinalizeScore = async () => {
    if (!user || !user.pending_score) return;
    try {
      // BE handles it server-side using admin signer (cheaper for user, no MetaMask popup)
      await api.finalizeScoreOnchain(user.token_id);
      toast.success("Score finalized", "Your new score is now live.");
      refetch();
    } catch (e) {
      toast.error("Finalize failed", e.message);
    }
  };

  const handleRefreshScore = async () => {
    try {
      toast.info("Refreshing score", "Running the agent quorum...");
      await api.underwrite(walletAddress);
      toast.success("Score updated", "Quorum re-signed and submitted.");
      refetch();
    } catch (e) {
      toast.error("Refresh failed", e.message);
    }
  };

  const disconnectWallet = () => {
    localStorage.removeItem("wallet_address");
    router.push("/");
  };

  return {
    walletAddress,
    user,
    loading,
    error,
    refetch,
    bootError,

    // UI state
    activeTab, setActiveTab,
    historyView, setHistoryView, goToHistory,
    activeModal, setActiveModal,
    amount, setAmount,
    targetAddress, setTargetAddress,
    selectedLoan, setSelectedLoan,

    // History
    fullLoans, loanPage, setLoanPage,
    fullAttestations, attestPage, setAttestPage,

    // Tx flow
    tx,
    closeTxModal,

    // Actions
    handleBorrow,
    handleRepay,
    handleVouch,
    handleFaucet,
    handleFinalizeScore,
    handleRefreshScore,
    disconnectWallet,
  };
}
"use client";

import { useDashboard } from "./useDashboard";
import styles from "./dashboard.module.css";

import HomeTab from "./tabs/HomeTab";
import PoolTab from "./tabs/PoolTab";
import MarketTab from "./tabs/MarketTab";
import HistoryTab from "./tabs/HistoryTab";
import ProfileTab from "./tabs/ProfileTab";

import TxModal from "@/components/TxModal";
import BorrowModal from "@/components/modals/BorrowModal";
import RepayModal from "@/components/modals/RepayModal";
import VouchModal from "@/components/modals/VouchModal";
import { SkeletonDashboard } from "@/components/Skeleton";
import { shortAddress } from "@/lib/format";
import AttestationsTab from "./tabs/AttestationsTab";

export default function Dashboard() {
  const dash = useDashboard();
  const {
    walletAddress, user, loading, error, refetch,
    activeTab, setActiveTab,
    historyView, setHistoryView, goToHistory,
    fullLoans, loanPage, setLoanPage,
    fullAttestations, attestPage, setAttestPage,
    activeModal, setActiveModal,
    amount, setAmount, targetAddress, setTargetAddress,
    selectedLoan, setSelectedLoan,
    tx, closeTxModal,
    handleBorrow, handleRepay, handleVouch,
    handleFaucet, handleFinalizeScore, handleRefreshScore,
    disconnectWallet,
  } = dash;

  if (loading && !user) {
    return (
      <main className="container main-content">
        <div className={`flex-row ${styles.header}`}>
          <h2>Credit<span className="text-orange">Graph</span></h2>
        </div>
        <SkeletonDashboard />
      </main>
    );
  }

  if (error && !user) {
    return (
      <main className="container">
        <h2>Couldn't load your dashboard</h2>
        <p style={{ color: "var(--text-muted)" }}>{error.message}</p>
        <button className="btn-primary" onClick={() => (window.location.href = "/")}>
          Go home
        </button>
      </main>
    );
  }

  const isSubmitting =
    tx.state.stage !== "idle" && tx.state.stage !== "done" && tx.state.stage !== "error";

  return (
    <>
      <main className="container main-content">
        <div className={`flex-row ${styles.header}`}>
          <h2>Credit<span className="text-orange">Graph</span></h2>
          <span className={styles.walletBadge}>{shortAddress(walletAddress)}</span>
        </div>

        {activeTab === "dashboard" && (
          <HomeTab
            user={user}
            styles={styles}
            setActiveModal={setActiveModal}
            setAmount={setAmount}
            setSelectedLoan={setSelectedLoan}
            goToHistory={goToHistory}
            handleFaucet={handleFaucet}
            handleFinalizeScore={handleFinalizeScore}
            handleRefreshScore={handleRefreshScore}
          />
        )}

        {activeTab === "pool" && (
          <PoolTab
            walletAddress={walletAddress}
            user={user}
            tx={tx}
            refetchUser={refetch}
          />
        )}

        {activeTab === "market" && <MarketTab chainKey="arbitrumSepolia" />}

        {activeTab === "attestations" && (
          <AttestationsTab
            walletAddress={walletAddress}
            user={user}
            tx={tx}
            refetchUser={refetch}
            setActiveModal={setActiveModal}
            setAmount={setAmount}
            setTargetAddress={setTargetAddress}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab
            fullLoans={fullLoans}
            loanPage={loanPage}
            setLoanPage={setLoanPage}
            fullAttestations={fullAttestations}
            attestPage={attestPage}
            setAttestPage={setAttestPage}
            historyView={historyView}
            setHistoryView={setHistoryView}
            styles={styles}
          />
        )}

        {activeTab === "profile" && (
          <ProfileTab
            user={user}
            styles={styles}
            setActiveModal={setActiveModal}
            disconnectWallet={disconnectWallet}
          />
        )}

        {/* Action modals */}
        {activeModal === "borrow" && (
          <BorrowModal
            user={user}
            amount={amount}
            setAmount={setAmount}
            onConfirm={handleBorrow}
            onCancel={() => setActiveModal(null)}
            isSubmitting={isSubmitting}
          />
        )}

        {activeModal === "repay" && (
          <RepayModal
            loanId={selectedLoan}
            amount={amount}
            setAmount={setAmount}
            onConfirm={handleRepay}
            onCancel={() => setActiveModal(null)}
            isSubmitting={isSubmitting}
          />
        )}

        {activeModal === "vouch" && (
          <VouchModal
            amount={amount}
            setAmount={setAmount}
            targetAddress={targetAddress}
            setTargetAddress={setTargetAddress}
            onConfirm={handleVouch}
            onCancel={() => setActiveModal(null)}
            isSubmitting={isSubmitting}
          />
        )}

        {activeModal === "increase_score" && (
          <div className="modal-overlay">
            <div className="card modal-card">
              <h2>Increase your score</h2>
              <p>Three levers, in order of impact:</p>
              <ul
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  paddingLeft: 20,
                  color: "var(--text-muted)",
                  marginBottom: 20,
                }}
              >
                <li>Repay loans on time — every on-time payment builds your graduation streak.</li>
                <li>Get vouched for by a high-tier friend — their bond directly boosts your limit.</li>
                <li>Connect more financial data sources for the agents to verify.</li>
              </ul>
              <button className="btn-primary" onClick={() => setActiveModal(null)}>
                Got it
              </button>
            </div>
          </div>
        )}

        <TxModal state={tx.state} chainKey="arbitrumSepolia" onClose={closeTxModal} />
      </main>

      <nav className="bottom-nav">
        <div className="nav-container">
          <NavBtn icon="⌂" label="Home" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
          <NavBtn icon="$" label="Pool" active={activeTab === "pool"} onClick={() => setActiveTab("pool")} />
          <NavBtn icon="🤝" label="Vouch" active={activeTab === "attestations"} onClick={() => setActiveTab("attestations")} />
          <NavBtn icon="📊" label="Market" active={activeTab === "market"} onClick={() => setActiveTab("market")} />
          <NavBtn icon="🕒" label="History" active={activeTab === "history"} onClick={() => setActiveTab("history")} />
          <NavBtn icon="👤" label="You" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
        </div>
      </nav>
    </>
  );
  function NavBtn({ icon, label, active, onClick }) {
    return (
      <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
        <span className="nav-icon">{icon}</span>
        {label}
      </button>
    );
  }
}
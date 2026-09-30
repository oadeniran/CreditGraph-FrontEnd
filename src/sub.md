app/globals.css
```css
:root {
  --primary: #FF6600;
  --primary-hover: #e55c00;
  --bg-color: #ffffff;
  --surface-color: #f9f9f9;
  --border-color: #eaeaea;
  --text-main: #1a1a1a;
  --text-muted: #666666;
  --radius: 12px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-main);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.container {
  max-width: 480px; /* Mobile-first width */
  margin: 0 auto;
  padding: 100px 20px 20px 20px; 
  min-height: 100vh;
}

/* Core Components */
.btn-primary {
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 16px 24px;
  border-radius: var(--radius);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: background 0.2s ease;
}

.btn-primary:hover { background-color: var(--primary-hover); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-secondary {
  background-color: transparent;
  color: var(--primary);
  border: 2px solid var(--primary);
  padding: 14px 24px;
  border-radius: var(--radius);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}

.card {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 16px;
}

.input-field {
  width: 100%;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 16px;
  margin-top: 8px;
  margin-bottom: 16px;
}

/* Typography */
h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
h2 { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
p { color: var(--text-muted); margin-bottom: 16px; }

/* Utilities */
.flex-row { display: flex; justify-content: space-between; align-items: center; }
.flex-gap { display: flex; gap: 12px; margin-bottom: 16px; }
.text-orange { color: var(--primary); }
.big-number { font-size: 36px; font-weight: 800; color: var(--text-main); margin: 8px 0; }

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}


/* Give the main container breathing room for the bottom nav */
.main-content {
  padding-bottom: 80px; 
}

/* Modal Fixes */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(2px);
}

.modal-card {
  width: 100%;
  max-width: 400px; /* This prevents the massive stretching */
  margin: 0 20px;
  background: var(--bg-color);
}

/* Bottom Navigation Menu */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background: var(--bg-color);
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: center;
  z-index: 50;
}

.nav-container {
  display: flex;
  width: 100%;
  max-width: 480px;
  justify-content: space-around;
  padding: 12px 0;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s;
}

.nav-item:hover {
  color: var(--primary-hover);
}

.nav-item.active {
  color: var(--primary);
}

.nav-icon {
  font-size: 20px;
  margin-bottom: 4px;
}
```


app/layout.js
```javascript
import Script from "next/script";
import "./globals.css";

export const metadata = {
  title: "CreditGraph",
  description: "The onchain credit identity layer for 1.4 billion people.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Injects the runtime variables before React loads */}
        <Script src="/env.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```


app/page.js
```javascript
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function Landing() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMetaMask, setHasMetaMask] = useState(true);

  // Check if MetaMask is installed when the component mounts
  useEffect(() => {
    if (typeof window !== "undefined" && !window.ethereum) {
      setHasMetaMask(false);
    }
  }, []);

  const connectWallet = async () => {
    setError("");
    
    if (!window.ethereum) {
      setError("Please install MetaMask to use CreditGraph.");
      return;
    }

    setLoading(true);

    try {
      // 1. Trigger MetaMask popup and request account access
      const accounts = await window.ethereum.request({ 
        method: "eth_requestAccounts" 
      });
      
      const walletAddress = accounts[0];

      if (!walletAddress) {
        throw new Error("No account selected.");
      }

      // 2. Tell backend to onboard (Mint identity + initial score)
      // If they already exist, your BE handles it and just returns their info
      await api.onboardUser(walletAddress);

      // 3. Save to local storage to persist the session across reloads
      localStorage.setItem("wallet_address", walletAddress);
      
      // 4. Push to dashboard
      router.push("/dashboard");

    } catch (err) {
      console.error("Connection failed:", err);
      // Handle user rejecting the MetaMask popup specifically
      if (err.code === 4001) {
        setError("You rejected the connection request.");
      } else {
        setError(err.message || "Failed to connect wallet or onboard.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h1>Credit<span className="text-orange">Graph</span></h1>
        <p style={{ fontSize: "18px", marginTop: "16px" }}>
          The onchain credit identity layer for the unbanked 1.4 billion.
        </p>
      </div>
      
      <div style={{ width: "100%", paddingBottom: "40px" }}>
        {error && (
          <p style={{ color: "red", fontSize: "14px", marginBottom: "16px", background: "#ffe6e6", padding: "10px", borderRadius: "8px" }}>
            {error}
          </p>
        )}
        
        <button 
          className="btn-primary" 
          onClick={connectWallet}
          disabled={loading || !hasMetaMask}
        >
          {!hasMetaMask 
            ? "MetaMask Not Found" 
            : loading 
              ? "Connecting MetaMask..." 
              : "Connect Wallet"}
        </button>
      </div>
    </main>
  );
}
```


app/page.module.css
```css
.page {
  --background: #fafafa;
  --foreground: #fff;

  --text-primary: #000;
  --text-secondary: #666;

  --button-primary-hover: #383838;
  --button-secondary-hover: #f2f2f2;
  --button-secondary-border: #ebebeb;

  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: var(--font-geist-sans);
  background-color: var(--background);
}

.main {
  display: flex;
  flex: 1;
  width: 100%;
  max-width: 800px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  background-color: var(--foreground);
  padding: 120px 60px;
}

.intro {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  gap: 24px;
}

.intro h1 {
  max-width: 320px;
  font-size: 40px;
  font-weight: 600;
  line-height: 48px;
  letter-spacing: -2.4px;
  text-wrap: balance;
  color: var(--text-primary);
}

.intro p {
  max-width: 440px;
  font-size: 18px;
  line-height: 32px;
  text-wrap: balance;
  color: var(--text-secondary);
}

.intro a {
  font-weight: 500;
  color: var(--text-primary);
}

.ctas {
  display: flex;
  flex-direction: row;
  width: 100%;
  max-width: 440px;
  gap: 16px;
  font-size: 14px;
}

.ctas a {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 40px;
  padding: 0 16px;
  border-radius: 128px;
  border: 1px solid transparent;
  transition: 0.2s;
  cursor: pointer;
  width: fit-content;
  font-weight: 500;
}

a.primary {
  background: var(--text-primary);
  color: var(--background);
  gap: 8px;
}

a.secondary {
  border-color: var(--button-secondary-border);
}

/* Enable hover only on non-touch devices */
@media (hover: hover) and (pointer: fine) {
  a.primary:hover {
    background: var(--button-primary-hover);
    border-color: transparent;
  }

  a.secondary:hover {
    background: var(--button-secondary-hover);
    border-color: transparent;
  }
}

@media (max-width: 600px) {
  .main {
    padding: 48px 24px;
  }

  .intro {
    gap: 16px;
  }

  .intro h1 {
    font-size: 32px;
    line-height: 40px;
    letter-spacing: -1.92px;
  }
}

@media (prefers-color-scheme: dark) {
  .logo {
    filter: invert();
  }

  .page {
    --background: #000;
    --foreground: #000;

    --text-primary: #ededed;
    --text-secondary: #999;

    --button-primary-hover: #ccc;
    --button-secondary-hover: #1a1a1a;
    --button-secondary-border: #1a1a1a;
  }
}
```


app/dashboard/dashboard.module.css
```css
.loadingContainer {
  padding-top: 40px;
}

.header {
  margin-bottom: 24px;
}

.walletBadge {
  font-size: 14px;
  color: var(--text-muted);
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 12px;
}

.creditCard {
  background: var(--text-main);
  color: white;
}

.cardSubtitle {
  color: #aaa;
  margin-bottom: 0;
}

.cardValue {
  color: white;
}

.cardDivider {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #333;
}

.smallLabel {
  color: #aaa;
  font-size: 12px;
  margin: 0;
}

.boldValue {
  font-size: 20px;
  font-weight: bold;
}

.tierValue {
  font-size: 20px;
  font-weight: bold;
  color: var(--primary);
}

.alignRight {
  text-align: right;
}

.sectionTitle {
  margin-top: 32px;
  font-size: 18px;
}

.loanAmount {
  font-weight: bold;
}

.loanStateLate {
  font-size: 12px;
  color: red;
}

.loanStateActive {
  font-size: 12px;
  color: var(--primary);
}

.actionButton {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: #eee;
  cursor: pointer;
  font-weight: bold;
}

.attestCard {
  padding: 12px 16px;
}

.attestText {
  font-size: 14px;
}

.attestAmount {
  font-weight: bold;
  color: var(--primary);
}

.modalText {
  margin-bottom: 4px;
}

.modalNote {
  font-size: 12px;
  color: var(--primary);
}

.modalActions {
  margin-top: 16px;
  margin-bottom: 0;
}

.networkTitle {
  font-size: 22px;
}

.vouchBtnWrapper {
  margin-bottom: 24px;
}

.aboutList {
  font-size: 14px;
  padding-left: 20px;
  color: var(--text-muted);
}

.aboutListItem {
  margin-bottom: 8px;
}


.viewAllBtn {
  width: 100%;
  padding: 12px;
  background: none;
  border: 1px dashed var(--border-color);
  color: var(--primary);
  font-weight: 600;
  border-radius: var(--radius);
  cursor: pointer;
  margin-top: 8px;
}

.viewAllBtn:hover {
  background: var(--surface-color);
}

/* History Segmented Toggle */
.toggleContainer {
  display: flex;
  background: var(--surface-color);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 24px;
  border: 1px solid var(--border-color);
}

.toggleBtn {
  flex: 1;
  padding: 10px;
  border: none;
  background: none;
  border-radius: 8px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggleBtnActive {
  background: var(--bg-color);
  color: var(--primary);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

/* Profile Tab */
.profileContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 0;
}

.avatar {
  font-size: 64px;
  background: var(--surface-color);
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  border: 2px solid var(--primary);
  margin-bottom: 16px;
}

.profileAddress {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 24px;
}
```


app/dashboard/page.js
```javascript
"use client";
import { useDashboard } from "./useDashboard";
import styles from "./dashboard.module.css";

// Decoupled tab components
import HomeTab from "./tabs/HomeTab";
import HistoryTab from "./tabs/HistoryTab";
import ProfileTab from "./tabs/ProfileTab";

export default function Dashboard() {
  const {
    user, loading, activeTab, setActiveTab, historyView, setHistoryView, goToHistory,
    fullLoans, loanPage, setLoanPage, 
    fullAttestations, attestPage, setAttestPage, 
    activeModal, setActiveModal,
    amount, setAmount, targetAddress, setTargetAddress, isSubmitting,
    handleBorrow, handleVouch, handleRepay, setSelectedLoan, disconnectWallet
  } = useDashboard();

  if (loading) return <div className={`container ${styles.loadingContainer}`}>Loading identity...</div>;
  if (!user) return <div className={`container ${styles.loadingContainer}`}>Failed to load user. Please reconnect.</div>;

  return (
    <>
      <main className="container main-content">
        {/* Global Header */}
        <div className={`flex-row ${styles.header}`}>
          <h2>Credit<span className="text-orange">Graph</span></h2>
          <span className={styles.walletBadge}>
            {user.wallet_address.substring(0, 6)}...{user.wallet_address.substring(user.wallet_address.length - 4)}
          </span>
        </div>

        {/* --- RENDER ACTIVE TAB --- */}
        {activeTab === "dashboard" && (
          <HomeTab 
            user={user} styles={styles} 
            setActiveModal={setActiveModal} setAmount={setAmount} 
            setSelectedLoan={setSelectedLoan} goToHistory={goToHistory} 
          />
        )}

        {activeTab === "history" && (
          <HistoryTab 
            fullLoans={fullLoans} loanPage={loanPage} setLoanPage={setLoanPage}
            fullAttestations={fullAttestations} attestPage={attestPage} setAttestPage={setAttestPage}
            historyView={historyView} setHistoryView={setHistoryView} 
            styles={styles} 
          />
        )}

        {activeTab === "profile" && (
          <ProfileTab 
            user={user} styles={styles} 
            setActiveModal={setActiveModal} disconnectWallet={disconnectWallet} 
          />
        )}

        {/* --- GLOBAL MODALS --- */}
        {activeModal === "borrow" && (
          <div className="modal-overlay">
            <div className="card modal-card">
              <h2>Borrow Funds</h2>
              <p className={styles.modalText}>Available Headroom: <strong>${user.headroom} USDC</strong></p>
              <input type="number" className="input-field" placeholder="Amount (USDC)" value={amount} onChange={e => setAmount(e.target.value)} />
              <p className={styles.modalNote}>Fixed Term: 30 days | APR: 15%</p>
              <div className={`flex-gap ${styles.modalActions}`}>
                <button className="btn-secondary" onClick={() => setActiveModal(null)} disabled={isSubmitting}>Cancel</button>
                <button className="btn-primary" onClick={handleBorrow} disabled={isSubmitting}>{isSubmitting ? "Confirming..." : "Confirm"}</button>
              </div>
            </div>
          </div>
        )}

        {activeModal === "vouch" && (
          <div className="modal-overlay">
            <div className="card modal-card">
              <h2>Vouch for a Friend</h2>
              <p>Boost their limit. If they default, you lose this stake.</p>
              <input type="text" className="input-field" placeholder="Friend's Wallet Address" value={targetAddress} onChange={e => setTargetAddress(e.target.value)} />
              <input type="number" className="input-field" placeholder="Bond Amount (USDC)" value={amount} onChange={e => setAmount(e.target.value)} />
              <div className={`flex-gap ${styles.modalActions}`}>
                <button className="btn-secondary" onClick={() => setActiveModal(null)} disabled={isSubmitting}>Cancel</button>
                <button className="btn-primary" onClick={handleVouch} disabled={isSubmitting}>{isSubmitting ? "Staking..." : "Stake"}</button>
              </div>
            </div>
          </div>
        )}

        {activeModal === "repay" && (
          <div className="modal-overlay">
            <div className="card modal-card">
              <h2>Repay Loan</h2>
              <input type="number" className="input-field" placeholder="Amount to Repay (USDC)" value={amount} onChange={e => setAmount(e.target.value)} />
              <div className={`flex-gap ${styles.modalActions}`}>
                <button className="btn-secondary" onClick={() => setActiveModal(null)} disabled={isSubmitting}>Cancel</button>
                <button className="btn-primary" onClick={handleRepay} disabled={isSubmitting}>{isSubmitting ? "Processing..." : "Repay"}</button>
              </div>
            </div>
          </div>
        )}

        {activeModal === "increase_score" && (
          <div className="modal-overlay">
            <div className="card modal-card">
              <h2>Increase Score</h2>
              <p className={styles.modalText}>To increase your score, you can:</p>
              <ul className={styles.aboutList} style={{marginTop: "12px", marginBottom: "24px"}}>
                <li className={styles.aboutListItem}>Repay active loans on time to build your graduation streak.</li>
                <li className={styles.aboutListItem}>Get a trusted friend with a high tier to Vouch for you.</li>
                <li className={styles.aboutListItem}>Connect more mobile money data sources for the AI agents to verify.</li>
              </ul>
              <button className="btn-primary" onClick={() => setActiveModal(null)}>Understood</button>
            </div>
          </div>
        )}
      </main>

      {/* --- BOTTOM NAVIGATION --- */}
      <nav className="bottom-nav">
        <div className="nav-container">
          <button className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
            <span className="nav-icon">⌂</span> Home
          </button>
          <button className={`nav-item ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
            <span className="nav-icon">🕒</span> History
          </button>
          <button className={`nav-item ${activeTab === "profile" ? "active" : ""}`} onClick={() => setActiveTab("profile")}>
            <span className="nav-icon">👤</span> Profile
          </button>
        </div>
      </nav>
    </>
  );
}
```


app/dashboard/useDashboard.js
```javascript
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { txCoordinator } from "@/lib/blockchain";

export function useDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard", "history", "profile"
  const [historyView, setHistoryView] = useState("loans"); // "loans" or "attestations"
  const [activeModal, setActiveModal] = useState(null); 
  
  // Data States for Paginated History
  const [fullLoans, setFullLoans] = useState({ items: [], total_pages: 1, current_page: 1 });
  const [fullAttestations, setFullAttestations] = useState({ items: [], total_pages: 1, current_page: 1 });
  
  // Pagination States
  const [loanPage, setLoanPage] = useState(1);
  const [attestPage, setAttestPage] = useState(1);

  // Form States
  const [amount, setAmount] = useState("");
  const [targetAddress, setTargetAddress] = useState("");
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Initial User Fetch
  useEffect(() => {
    const fetchUser = async () => {
      const address = localStorage.getItem("wallet_address");
      if (!address) return router.push("/");

      try {
        const data = await api.getUserDashboard(address);
        setUser(data);
      } catch (err) {
        console.error("Failed to fetch dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  // 2. Fetch Paginated Loans (Triggers on mount, tab change, or page change)
  useEffect(() => {
    if (activeTab === "history" && historyView === "loans" && user) {
      api.getLoanHistory(user.wallet_address, loanPage, 5) // 5 items per page
         .then(data => setFullLoans(data))
         .catch(err => console.error("Loan history fetch error:", err));
    }
  }, [activeTab, historyView, loanPage, user]);

  // 3. Fetch Paginated Attestations (Triggers on mount, tab change, or page change)
  useEffect(() => {
    if (activeTab === "history" && historyView === "attestations" && user) {
      api.getAttestationHistory(user.wallet_address, attestPage, 5) // 5 items per page
         .then(data => setFullAttestations(data))
         .catch(err => console.error("Attestation history fetch error:", err));
    }
  }, [activeTab, historyView, attestPage, user]);

  // Navigation Helper
  const goToHistory = (view) => {
    setHistoryView(view);
    setLoanPage(1);     // Reset to page 1 on fresh navigation
    setAttestPage(1);   // Reset to page 1 on fresh navigation
    setActiveTab("history");
  };

  // Action Handlers
  const handleBorrow = async () => {
    setIsSubmitting(true);
    try {
      await txCoordinator.borrowFunds(user.wallet_address, amount, 30);
      window.location.reload(); 
    } catch (err) {
      alert("Borrow routine error: " + err.message);
    }
    setIsSubmitting(false);
  };

  const handleVouch = async () => {
    setIsSubmitting(true);
    try {
      await txCoordinator.vouchForFriend(user.wallet_address, targetAddress, amount);
      window.location.reload();
    } catch (err) {
      alert("Vouch routine error: " + err.message);
    }
    setIsSubmitting(false);
  };

  const handleRepay = async () => {
    setIsSubmitting(true);
    try {
      await txCoordinator.repayLoan(user.wallet_address, selectedLoan, amount);
      window.location.reload();
    } catch (err) {
      alert("Repayment routine error: " + err.message);
    }
    setIsSubmitting(false);
  };

  const disconnectWallet = () => {
    localStorage.removeItem("wallet_address");
    router.push("/");
  };

  return {
    user, loading,
    activeTab, setActiveTab,
    historyView, setHistoryView, goToHistory,
    fullLoans, loanPage, setLoanPage,
    fullAttestations, attestPage, setAttestPage,
    activeModal, setActiveModal,
    amount, setAmount, targetAddress, setTargetAddress, isSubmitting,
    handleBorrow, handleVouch, handleRepay, setSelectedLoan, disconnectWallet
  };
}
```


app/dashboard/tabs/HistoryTab.js
```javascript
export default function HistoryTab({ 
  fullLoans, loanPage, setLoanPage,
  fullAttestations, attestPage, setAttestPage,
  historyView, setHistoryView, styles 
}) {
  return (
    <div>
      <h2 className={styles.networkTitle} style={{marginBottom: "16px"}}>History</h2>
      
      {/* Segmented Toggle */}
      <div className={styles.toggleContainer}>
        <button 
          className={`${styles.toggleBtn} ${historyView === "loans" ? styles.toggleBtnActive : ""}`}
          onClick={() => setHistoryView("loans")}
        >
          Loans
        </button>
        <button 
          className={`${styles.toggleBtn} ${historyView === "attestations" ? styles.toggleBtnActive : ""}`}
          onClick={() => setHistoryView("attestations")}
        >
          Attestations
        </button>
      </div>

      {/* --- LOANS LIST --- */}
      {historyView === "loans" && (
        <div>
          {(!fullLoans.items || fullLoans.items.length === 0) ? (
            <p>No loan history found.</p>
          ) : (
            fullLoans.items.map((loan, i) => (
              <div key={i} className="card flex-row">
                <div>
                  <div className={styles.loanAmount}>${loan.principal} USDC</div>
                  <div style={{fontSize: "12px", color: loan.state === "Repaid" ? "green" : loan.state === "Defaulted" ? "red" : "var(--primary)"}}>
                    Status: {loan.state}
                  </div>
                </div>
                <span style={{fontSize: "12px", color: "#888"}}>ID: {loan.loan_id.substring(0, 4)}</span>
              </div>
            ))
          )}
          
          {/* Pagination Controls */}
          {fullLoans.total_pages > 1 && (
            <div className="flex-row" style={{ marginTop: "16px" }}>
              <button 
                className="btn-secondary" style={{ padding: "8px", width: "auto" }}
                disabled={loanPage === 1} 
                onClick={() => setLoanPage(prev => Math.max(prev - 1, 1))}
              >
                ← Prev
              </button>
              <span style={{ fontSize: "14px", alignSelf: "center", color: "var(--text-muted)" }}>
                Page {loanPage} of {fullLoans.total_pages}
              </span>
              <button 
                className="btn-secondary" style={{ padding: "8px", width: "auto" }}
                disabled={loanPage === fullLoans.total_pages} 
                onClick={() => setLoanPage(prev => prev + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- ATTESTATIONS LIST --- */}
      {historyView === "attestations" && (
        <div>
          {(!fullAttestations.items || fullAttestations.items.length === 0) ? (
            <p>No attestation history found.</p>
          ) : (
            fullAttestations.items.map((att, i) => (
              <div key={i} className={`card flex-row ${styles.attestCard}`}>
                <span className={styles.attestText}>User: {att.subject_address?.substring(0,6)}...</span>
                <div style={{textAlign: "right"}}>
                   <div className={styles.attestAmount}>${att.bond_amount} USDC</div>
                   <div style={{fontSize: "12px", color: att.active ? "green" : "gray"}}>{att.active ? "Active" : "Inactive"}</div>
                </div>
              </div>
            ))
          )}

          {/* Pagination Controls */}
          {fullAttestations.total_pages > 1 && (
            <div className="flex-row" style={{ marginTop: "16px" }}>
              <button 
                className="btn-secondary" style={{ padding: "8px", width: "auto" }}
                disabled={attestPage === 1} 
                onClick={() => setAttestPage(prev => Math.max(prev - 1, 1))}
              >
                ← Prev
              </button>
              <span style={{ fontSize: "14px", alignSelf: "center", color: "var(--text-muted)" }}>
                Page {attestPage} of {fullAttestations.total_pages}
              </span>
              <button 
                className="btn-secondary" style={{ padding: "8px", width: "auto" }}
                disabled={attestPage === fullAttestations.total_pages} 
                onClick={() => setAttestPage(prev => prev + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```


app/dashboard/tabs/HomeTab.js
```javascript
export default function HomeTab({ 
  user, styles, setActiveModal, setAmount, setSelectedLoan, goToHistory 
}) {
  const topLoans = user.active_loans?.slice(0, 5) || [];
  const topAttestations = user.active_attestations?.slice(0, 5) || [];

  return (
    <div>
      {/* Top Credit Card */}
      <div className={`card ${styles.creditCard}`}>
        <p className={styles.cardSubtitle}>Your Credit Limit</p>
        <div className={`big-number ${styles.cardValue}`}>${user.available_limit?.toFixed(2) || "0.00"} USDC</div>
        
        <div className={`flex-row ${styles.cardDivider}`}>
          <div>
            <p className={styles.smallLabel}>Credit Score</p>
            <div className={styles.boldValue}>{user.credit_score?.score || "Pending"}</div>
          </div>
          <div className={styles.alignRight}>
            <p className={styles.smallLabel}>Tier</p>
            <div className={styles.tierValue}>{user.credit_score?.tier || "1"}</div>
          </div>
        </div>
      </div>

      {/* Main Action Buttons */}
      <div className="flex-gap">
        <button className="btn-primary" onClick={() => { setAmount(""); setActiveModal("borrow"); }}>
          Borrow
        </button>
        <button className="btn-secondary" onClick={() => { setAmount(""); setActiveModal("vouch"); }}>
          Vouch
        </button>
      </div>

      {/* Active Loans */}
      <h2 className={styles.sectionTitle}>Active Loans</h2>
      {topLoans.length === 0 ? (
        <p className={styles.smallLabel}>No active loans.</p>
      ) : (
        topLoans.map(loan => (
          <div key={loan.loan_id} className="card flex-row">
            <div>
              <div className={styles.loanAmount}>${loan.outstanding} USDC</div>
              <div className={loan.state === "Late" ? styles.loanStateLate : styles.loanStateActive}>
                {loan.state}
              </div>
            </div>
            <button 
              className={styles.actionButton}
              onClick={() => {
                setSelectedLoan(loan.loan_id);
                setAmount(loan.outstanding.toString());
                setActiveModal("repay");
              }}
            >
              Repay
            </button>
          </div>
        ))
      )}
      {user.active_loans?.length > 5 && (
        <button className={styles.viewAllBtn} onClick={() => goToHistory("loans")}>
          View All Loans
        </button>
      )}

      {/* Active Attestations */}
      <h2 className={styles.sectionTitle} style={{marginTop: "24px"}}>Social Attestations</h2>
      {topAttestations.length === 0 ? (
        <p className={styles.smallLabel}>You haven't vouched for anyone yet.</p>
      ) : (
        topAttestations.map((att, i) => (
          <div key={i} className={`card flex-row ${styles.attestCard}`}>
            <span className={styles.attestText}>Vouched for: {att.subject_address?.substring(0,6)}...</span>
            <span className={styles.attestAmount}>${att.bond_amount}</span>
          </div>
        ))
      )}
      {user.active_attestations?.length > 5 && (
        <button className={styles.viewAllBtn} onClick={() => goToHistory("attestations")}>
          View All Vouches
        </button>
      )}
    </div>
  );
}
```


app/dashboard/tabs/ProfileTab.js
```javascript
export default function ProfileTab({ 
  user, styles, setActiveModal, disconnectWallet 
}) {
  return (
    <div className={styles.profileContainer}>
      <div className={styles.avatar}>👤</div>
      <div className={styles.profileAddress}>
        {user.wallet_address.substring(0, 8)}...{user.wallet_address.substring(user.wallet_address.length - 6)}
      </div>
      
      <div className="card" style={{width: "100%", textAlign: "left", marginBottom: "24px"}}>
        <p style={{margin: 0, fontSize: "14px", color: "var(--text-muted)"}}>Identity Token ID</p>
        <p style={{fontWeight: "bold", fontSize: "18px", margin: "4px 0 16px 0"}}>#{user.token_id}</p>
        
        <p style={{margin: 0, fontSize: "14px", color: "var(--text-muted)"}}>Current Tier</p>
        <p style={{fontWeight: "bold", fontSize: "18px", color: "var(--primary)", margin: "4px 0 0 0"}}>Tier {user.credit_score?.tier}</p>
      </div>

      <button className="btn-primary" onClick={() => setActiveModal("increase_score")} style={{marginBottom: "16px"}}>
        Increase Credit Score
      </button>
      <button className="btn-secondary" onClick={disconnectWallet}>
        Disconnect Wallet
      </button>
    </div>
  );
}
```


lib/api.js
```javascript
import { API_URL } from "./config";

// --- Internal Fetch Wrapper ---
const fetchAPI = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API Request Failed: ${response.status}`);
  }
  
  return response.json();
};

// --- API Endpoints ---

export const api = {
  /**
   * Onboards a user, mints identity, and generates first score.
   */
  onboardUser: async (walletAddress) => {
    return fetchAPI("/api/onboard", {
      method: "POST",
      body: JSON.stringify({ wallet_address: walletAddress }),
    });
  },

  /**
   * Fetches the complete dashboard state for a user.
   */
  getUserDashboard: async (walletAddress) => {
    return fetchAPI(`/api/user/${walletAddress}`, {
      method: "GET",
    });
  },

  /**
   * Originates a new loan.
   */
  borrowFunds: async (payload) => {
    // payload: { wallet_address, amount, term_days, tx_hash }
    return fetchAPI("/api/borrow", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Repays an active loan.
   */
  repayLoan: async (payload) => {
    // payload: { wallet_address, loan_id, amount, tx_hash }
    return fetchAPI("/api/repay", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Social Attestation: Vouch for a friend.
   */
  vouchForFriend: async (payload) => {
    // payload: { attester_address, subject_address, bond_amount, tx_hash }
    return fetchAPI("/api/attest", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetches full loan history (Paginated)
   */
  getLoanHistory: async (walletAddress, page = 1, size = 5) => {
    return fetchAPI(`/api/user/${walletAddress}/loans?page=${page}&size=${size}`, { method: "GET" });
  },

  /**
   * Fetches full attestation history (Paginated)
   */
  getAttestationHistory: async (walletAddress, page = 1, size = 5) => {
    return fetchAPI(`/api/user/${walletAddress}/attestations?page=${page}&size=${size}`, { method: "GET" });
  }
};
```


lib/blockchain.js
```javascript
import { ethers } from "ethers";
import { api } from "./api";

// --- Configuration ---
// Leave these blank or set to local addresses. If blank, it automatically triggers the mock fallback.
const CONTRACT_ADDRESSES = {
  USDC: "", 
  LoanManager: "",
  SocialAttestation: ""
};

// Minimal ABIs required for executing functions
const MINIMAL_ABIS = {
  USDC: [
    "function approve(address spender, uint256 amount) external returns (bool)"
  ],
  LoanManager: [
    "function originate(uint256 amount, uint64 termDays) external returns (uint256)",
    "function repay(uint256 loanId, uint256 amount) external"
  ],
  SocialAttestation: [
    "function attest(address subject, uint256 bondAmount) external"
  ]
};

/**
 * Helper to get an ethers signer connected to MetaMask
 */
const getSigner = async () => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No crypto wallet found");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  return await provider.getSigner();
};

export const txCoordinator = {
  /**
   * Originates a loan on-chain, or falls back to mock if unconfigured/fails.
   */
  borrowFunds: async (walletAddress, amountStr, termDays = 30) => {
    try {
      if (!CONTRACT_ADDRESSES.LoanManager) throw new Error("LoanManager address not configured");
      
      const signer = await getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.LoanManager, MINIMAL_ABIS.LoanManager, signer);
      
      // USDC usually uses 6 decimals
      const parsedAmount = ethers.parseUnits(amountStr, 6);
      
      // 1. Submit transaction to MetaMask
      const tx = await contract.originate(parsedAmount, termDays);
      console.log("Real on-chain tx submitted:", tx.hash);
      
      // 2. Wait for 1 confirmation (optional for speed, but great for safety)
      await tx.wait(1);

      // 3. Notify backend with the REAL transaction hash
      return await api.borrowFunds({
        wallet_address: walletAddress,
        amount: parseFloat(amountStr),
        term_days: termDays,
        tx_hash: tx.hash
      });

    } catch (error) {
      console.warn("[Web3 Fallback Active] Real borrow failed or unconfigured. Running mock:", error.message);
      
      // EXECUTE FALLBACK: Hit the backend with a fake hash so your demo keeps rolling
      return await api.borrowFunds({
        wallet_address: walletAddress,
        amount: parseFloat(amountStr),
        term_days: termDays,
        tx_hash: "mock_tx_borrow_" + Date.now()
      });
    }
  },

  /**
   * Handles Social Attestation. Approves USDC token allowance then stakes into the attestation contract.
   */
  vouchForFriend: async (attesterAddress, subjectAddress, bondAmountStr) => {
    try {
      if (!CONTRACT_ADDRESSES.SocialAttestation || !CONTRACT_ADDRESSES.USDC) {
        throw new Error("SocialAttestation or USDC addresses not configured");
      }

      const signer = await getSigner();
      const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.USDC, MINIMAL_ABIS.USDC, signer);
      const attestationContract = new ethers.Contract(CONTRACT_ADDRESSES.SocialAttestation, MINIMAL_ABIS.SocialAttestation, signer);
      
      const parsedAmount = ethers.parseUnits(bondAmountStr, 6);

      // 1. Approve contract to spend your USDC bond
      const approveTx = await usdcContract.approve(CONTRACT_ADDRESSES.SocialAttestation, parsedAmount);
      await approveTx.wait(1);

      // 2. Fire the attestation transaction
      const tx = await attestationContract.attest(subjectAddress, parsedAmount);
      await tx.wait(1);

      return await api.vouchForFriend({
        attester_address: attesterAddress,
        subject_address: subjectAddress,
        bond_amount: parseFloat(bondAmountStr),
        tx_hash: tx.hash
      });

    } catch (error) {
      console.warn("[Web3 Fallback Active] Real vouch failed or unconfigured. Running mock:", error.message);
      
      return await api.vouchForFriend({
        attester_address: attesterAddress,
        subject_address: subjectAddress,
        bond_amount: parseFloat(bondAmountStr),
        tx_hash: "mock_tx_vouch_" + Date.now()
      });
    }
  },

  /**
   * Repays an active loan. Approves USDC allowance then hits LoanManager.repay()
   */
  repayLoan: async (walletAddress, loanId, amountStr) => {
    try {
      if (!CONTRACT_ADDRESSES.LoanManager || !CONTRACT_ADDRESSES.USDC) {
        throw new Error("LoanManager or USDC addresses not configured");
      }

      const signer = await getSigner();
      const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.USDC, MINIMAL_ABIS.USDC, signer);
      const loanContract = new ethers.Contract(CONTRACT_ADDRESSES.LoanManager, MINIMAL_ABIS.LoanManager, signer);
      
      const parsedAmount = ethers.parseUnits(amountStr, 6);

      // 1. Approve LoanManager to take the repayment amount
      const approveTx = await usdcContract.approve(CONTRACT_ADDRESSES.LoanManager, parsedAmount);
      await approveTx.wait(1);

      // 2. Submit repayment transaction
      const tx = await loanContract.repay(loanId, parsedAmount);
      await tx.wait(1);

      return await api.repayLoan({
        wallet_address: walletAddress,
        loan_id: loanId,
        amount: parseFloat(amountStr),
        tx_hash: tx.hash
      });

    } catch (error) {
      console.warn("[Web3 Fallback Active] Real repayment failed or unconfigured. Running mock:", error.message);
      
      return await api.repayLoan({
        wallet_address: walletAddress,
        loan_id: loanId,
        amount: parseFloat(amountStr),
        tx_hash: "mock_tx_repay_" + Date.now()
      });
    }
  }
};
```


lib/config.js
```javascript
// Safely grabs runtime env vars injected by public/env.js, falling back to build-time vars
const getEnv = (key, fallback = "") => {
  if (typeof window !== "undefined" && window.env?.[key]) {
    return window.env[key];
  }
  return fallback;
};

const rawUrl = getEnv("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000");

export const API_URL = rawUrl.replace(/\/$/, ""); // Strip trailing slash just in case
export const API_KEY = getEnv("NEXT_PUBLIC_API_KEY", process.env.NEXT_PUBLIC_API_KEY || "");
```



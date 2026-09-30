"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { wallet } from "@/lib/wallet";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";

export default function Landing() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasWallet, setHasWallet] = useState(true);

  useEffect(() => {
    setHasWallet(wallet.isInstalled());
  }, []);

  const connectWallet = async () => {
    setError("");

    if (!wallet.isInstalled()) {
      setError("Please install MetaMask to use CreditGraph.");
      return;
    }

    setLoading(true);
    try {
      const { address } = await wallet.connect();
      if (!address) throw new Error("No account selected.");

      // Network check
      const onCorrect = await wallet.isOnCorrectNetwork();
      if (!onCorrect) {
        showToast({
          kind: "info",
          title: "Switching network",
          message: "Switching to Arbitrum Sepolia...",
        });
        await wallet.switchToCorrectNetwork();
      }

      // Onboard via BE (mints identity + runs underwriting)
      showToast({
        kind: "info",
        title: "Setting up your identity",
        message: "Minting your soulbound NFT and running the agent quorum...",
        duration: 8000,
      });

      const result = await api.onboardUser(address);

      showToast({
        kind: "success",
        title: "Welcome to CreditGraph",
        message: `Identity #${result.token_id} ready.`,
      });

      localStorage.setItem("wallet_address", address);
      router.push("/dashboard");
    } catch (err) {
      console.error("Connection failed:", err);
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
    <main
      className="container"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h1>
          Credit<span className="text-orange">Graph</span>
        </h1>
        <p style={{ fontSize: "18px", marginTop: "16px" }}>
          The onchain credit identity layer for the unbanked 1.4 billion.
        </p>
      </div>

      <div style={{ width: "100%", paddingBottom: "40px" }}>
        {error && (
          <p
            style={{
              color: "red",
              fontSize: "14px",
              marginBottom: "16px",
              background: "#ffe6e6",
              padding: "10px",
              borderRadius: "8px",
            }}
          >
            {error}
          </p>
        )}

        <button className="btn-primary" onClick={connectWallet} disabled={loading || !hasWallet}>
          {!hasWallet
            ? "MetaMask Not Found"
            : loading
              ? "Connecting..."
              : "Connect Wallet"}
        </button>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { wallet } from "@/lib/wallet";
import { useChain } from "@/lib/chainContext";
import { toast } from "@/lib/toast";

/**
 * Shows a sticky banner at the top of the screen if the user's wallet is on
 * the wrong network for the ACTIVE chain. Offers a one-click switch.
 *
 * Reactive: when the user picks a different chain in the UI (via chain
 * switcher), this re-checks against the new chain.
 */
export default function NetworkGuard() {
  const { activeChain, activeChainKey } = useChain();
  const [wrongNetwork, setWrongNetwork] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!wallet.isInstalled()) {
        if (!cancelled) setWrongNetwork(false);
        return;
      }
      const address = await wallet.currentAddress();
      if (!address) {
        if (!cancelled) setWrongNetwork(false);
        return;
      }
      const ok = await wallet.isOnCorrectNetwork();
      if (!cancelled) setWrongNetwork(!ok);
    }

    check();

    const unsubChain = wallet.onChainChange(() => check());
    const unsubAcct = wallet.onAccountChange(() => check());

    return () => {
      cancelled = true;
      unsubChain && unsubChain();
      unsubAcct && unsubAcct();
    };
  }, [activeChainKey]); // ← re-check whenever the UI's active chain changes

  if (!wrongNetwork) return null;

  const handleSwitch = async () => {
    try {
      await wallet.switchToCorrectNetwork();
    } catch (e) {
      toast.error("Could not switch network", e?.message || "");
    }
  };

  return (
    <div className="network-banner">
      <span>
        Wrong network. Switch to <strong>{activeChain.name}</strong> to use CreditGraph.
      </span>
      <button onClick={handleSwitch}>Switch</button>
    </div>
  );
}
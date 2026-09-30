"use client";

import { useEffect, useState } from "react";
import { wallet, activeChain } from "@/lib/wallet";
import { toast } from "@/lib/toast";

/**
 * Shows a sticky banner at the top of the screen if the user's wallet is on
 * the wrong network. Offers a one-click switch.
 */
export default function NetworkGuard() {
  const [wrongNetwork, setWrongNetwork] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!wallet.isInstalled()) {
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
  }, []);

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
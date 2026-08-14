"use client";

import type { ReactNode } from "react";
import { MarketplaceProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui/toast";

/** Client boundary for the whole app: marketplace runtime + toasts. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <MarketplaceProvider>
      <ToastProvider>{children}</ToastProvider>
    </MarketplaceProvider>
  );
}

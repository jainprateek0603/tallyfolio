"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);
  return <SessionProvider>{children}</SessionProvider>;
}

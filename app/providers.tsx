"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

import { ensureLeafletDefaultIcon } from "@/lib/leaflet-icon-fix";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void ensureLeafletDefaultIcon()
  }, [])

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
}
// app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import Providers from "./providers";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], display: "swap" })

export const metadata = {
  title: "Superblog",
  description: "A blog app using Next.js and Prisma",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <AppShell>
            {children}
          </AppShell>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

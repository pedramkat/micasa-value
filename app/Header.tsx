"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="w-full bg-background shadow-sm py-4 px-8 border-b border-border">
      <nav className="flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-foreground hover:text-primary transition-colors">
          Superblog
        </Link>
        <div className="flex items-center space-x-4">
          <Link 
            href="/houses" 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition"
          >
            Houses
          </Link>
          <Link 
            href="/configurations" 
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80 transition"
          >
            Configurations
          </Link>
          {session ? (
            <>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-muted-foreground">
                  {session.user?.name && <div>{session.user.name}</div>}
                  <div>{session.user?.email}</div>
                </div>
                <button
                  onClick={() => signOut()}
                  className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:bg-destructive/90 transition"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <Link href="/login" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition">
              Sign In
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

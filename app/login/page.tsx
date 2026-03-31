"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Loader2, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    try {
      event.preventDefault();
      if (isLoading) return
      setIsLoading(true)
      const formData = new FormData(event.currentTarget);
      const response = await signIn("credentials", {
        ...Object.fromEntries(formData),
        redirect: false,
      });

      if (response?.error) {
        setError("Invalid credentials");
        setIsLoading(false)
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("An error occurred during login");
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Sign in</CardTitle>
          <p className="text-sm text-muted-foreground">Enter your credentials to access your dashboard.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input id="email" name="email" type="email" required placeholder="name@company.com" />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input id="password" name="password" type="password" required placeholder="••••••••" />
            </div>

            {error && <div className="text-sm text-destructive">{error}</div>}

            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Sign in
            </Button>

            <div className="text-sm text-muted-foreground">
              No account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Register
              </Link>
              .
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

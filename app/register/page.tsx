"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Loader2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    try {
      event.preventDefault();
      if (isLoading) return
      setIsLoading(true)
      const formData = new FormData(event.currentTarget);
      const signInResult = await signIn("credentials", {
        ...Object.fromEntries(formData),
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Failed to sign in after registration");
        setIsLoading(false)
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration failed");
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Create account</CardTitle>
          <p className="text-sm text-muted-foreground">Create your profile to start using the dashboard.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input id="name" name="name" type="text" required placeholder="Full name" />
            </div>

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
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Register
            </Button>

            <div className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
              .
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

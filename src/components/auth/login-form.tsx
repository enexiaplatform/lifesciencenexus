"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { DemoDeploymentNotice } from "@/components/auth/demo-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeNextPath } from "@/lib/auth/next-path";
import { loginSchema } from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/client";

type LoginFormProps = {
  authEnabled: boolean;
  next?: string;
  /** Set by /auth/callback when the code exchange fails. */
  error?: string;
};

export function LoginForm({ authEnabled, next, error }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(
    error ? "Authentication failed. Please sign in again." : null,
  );
  const [pending, setPending] = useState(false);

  if (!authEnabled) {
    return <DemoDeploymentNotice />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Check your input.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setMessage("Authentication is not configured on this deployment.");
      return;
    }

    setPending(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setPending(false);

    if (signInError) {
      setMessage("Invalid email or password.");
      return;
    }

    router.push(sanitizeNextPath(next));
    router.refresh();
  }

  return (
    <div>
      <h1 className="font-display text-lg font-semibold tracking-tight text-slate-900">
        Sign in
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Access your Life Science Nexus workspace.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
        {message ? (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {message}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link
          href="/forgot-password"
          className="font-medium text-spectral-600 underline-offset-4 hover:text-spectral-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2"
        >
          Forgot password?
        </Link>
        <Link
          href="/signup"
          className="font-medium text-spectral-600 underline-offset-4 hover:text-spectral-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}

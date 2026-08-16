"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { DemoDeploymentNotice } from "@/components/auth/demo-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordSchema } from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/client";

type ForgotPasswordFormProps = {
  authEnabled: boolean;
};

export function ForgotPasswordForm({ authEnabled }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!authEnabled) {
    return <DemoDeploymentNotice />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
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
    // Deliberately ignore the result: the same neutral confirmation is shown
    // either way so this form cannot be used to enumerate accounts.
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setPending(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight text-slate-900">
          Reset link sent
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          If an account exists for{" "}
          <span className="font-medium text-slate-900">{email}</span>, a reset
          link is on its way. Follow it to choose a new password.
        </p>
        <p className="mt-4 text-sm">
          <Link
            href="/login"
            className="font-medium text-spectral-600 underline-offset-4 hover:text-spectral-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-lg font-semibold tracking-tight text-slate-900">
        Reset your password
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Enter your account email and we will send a reset link.
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

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-4 text-sm">
        <Link
          href="/login"
          className="font-medium text-spectral-600 underline-offset-4 hover:text-spectral-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

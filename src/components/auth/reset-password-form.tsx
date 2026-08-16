"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { DemoDeploymentNotice } from "@/components/auth/demo-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordSchema } from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/client";

type ResetPasswordFormProps = {
  authEnabled: boolean;
};

export function ResetPasswordForm({ authEnabled }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [updated, setUpdated] = useState(false);

  if (!authEnabled) {
    return <DemoDeploymentNotice />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
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
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    setPending(false);

    if (updateError) {
      setMessage(
        "Could not update the password. Request a fresh reset link and try again.",
      );
      return;
    }

    setUpdated(true);
  }

  if (updated) {
    return (
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight text-slate-900">
          Password updated
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Your password has been changed. You can now sign in with the new
          password.
        </p>
        <p className="mt-4 text-sm">
          <Link
            href="/login"
            className="font-medium text-spectral-600 underline-offset-4 hover:text-spectral-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2"
          >
            Continue to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-lg font-semibold tracking-tight text-slate-900">
        Choose a new password
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Set a new password for your account.
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
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="text-xs text-slate-500">At least 8 characters.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}

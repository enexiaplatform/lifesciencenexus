"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { DemoDeploymentNotice } from "@/components/auth/demo-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupSchema } from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/client";

type SignupFormProps = {
  authEnabled: boolean;
};

export function SignupForm({ authEnabled }: SignupFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!authEnabled) {
    return <DemoDeploymentNotice />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = signupSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
    });
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
    const { error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setPending(false);

    if (signUpError) {
      setMessage(signUpError.message);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight text-slate-900">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          We sent a confirmation link to{" "}
          <span className="font-medium text-slate-900">{email}</span>. Confirm
          your account to finish signing up.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Workspace provisioning is manual in this release: once your email is
          confirmed, access to a workspace is granted by the operator.
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
        Create account
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Request access to a Life Science Nexus workspace.
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
          <Label htmlFor="full-name">Full name</Label>
          <Input
            id="full-name"
            name="full-name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </div>

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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="text-xs text-slate-500">At least 8 characters.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm password</Label>
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
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-sm">
        <Link
          href="/login"
          className="font-medium text-spectral-600 underline-offset-4 hover:text-spectral-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2"
        >
          Already have an account? Sign in
        </Link>
      </p>
    </div>
  );
}

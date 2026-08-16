import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { getSupabaseEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Sign in",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams;
  return (
    <LoginForm
      authEnabled={getSupabaseEnv() !== null}
      next={next}
      error={error}
    />
  );
}

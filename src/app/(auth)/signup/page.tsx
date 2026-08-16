import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/signup-form";
import { getSupabaseEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return <SignupForm authEnabled={getSupabaseEnv() !== null} />;
}

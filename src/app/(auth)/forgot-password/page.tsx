import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getSupabaseEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm authEnabled={getSupabaseEnv() !== null} />;
}

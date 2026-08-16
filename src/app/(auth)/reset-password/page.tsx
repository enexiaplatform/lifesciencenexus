import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getSupabaseEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Choose a new password",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm authEnabled={getSupabaseEnv() !== null} />;
}

import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { getDataBackend } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function AppGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <AppShell
      backend={getDataBackend()}
      user={user ? { email: user.email ?? "" } : null}
    >
      {children}
    </AppShell>
  );
}

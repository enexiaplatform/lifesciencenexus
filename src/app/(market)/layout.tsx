import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { getDataBackend } from "@/lib/env";

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <AppShell backend={getDataBackend()}>{children}</AppShell>;
}

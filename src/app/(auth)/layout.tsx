import type { ReactNode } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Minimal centered chrome for the auth pages (login, signup, password
 * recovery) — wordmark, a single card, and a small footer line.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <main id="main-content" className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Wordmark href="/" size={28} />
        </div>
        <Card className="shadow-sm">
          <CardContent className="p-6">{children}</CardContent>
        </Card>
      </main>
      <footer className="mt-6 text-xs text-slate-500">
        © 2026 Enexia Platform
      </footer>
    </div>
  );
}

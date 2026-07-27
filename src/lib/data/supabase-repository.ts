import type { NexusRepository } from "./repository";

/**
 * Supabase backend — not yet implemented.
 *
 * The schema migrations and RLS policies for this backend are a separate
 * workstream. Until then, failing loudly here is deliberate: it prevents a
 * misconfigured deployment from silently serving an empty database as if it
 * were real data (evidence-first applies to infrastructure too).
 *
 * To run without Supabase, unset the Supabase env vars or set
 * `NEXUS_DATA_BACKEND=demo`.
 */
export function createSupabaseRepository(): NexusRepository {
  throw new Error(
    "Supabase repository backend is not yet implemented. " +
      "Set NEXUS_DATA_BACKEND=demo (or remove NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) " +
      "to use the in-memory demo backend.",
  );
}

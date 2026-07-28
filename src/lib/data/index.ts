import { demoTenantId, getDataBackend } from "@/lib/env";

import type { NexusRepository } from "./repository";

/**
 * Repository factory.
 *
 * Resolves the active backend from `@/lib/env` (`getDataBackend()`):
 *  - `demo` (default when Supabase env is absent) → in-memory DemoRepository
 *  - `supabase` → lazily imported; currently throws a clear "not yet
 *    implemented" error from `./supabase-repository`.
 *
 * Both backends are lazy-imported so the demo bundle never loads Supabase
 * code and vice versa. The resolved repository is cached process-wide.
 */

// Cached on globalThis so Next.js dev mode's split server bundles (page
// renders vs server-action executions) share ONE repository instance —
// otherwise demo-mode mutations succeed but are invisible to later renders.
const globalCache = globalThis as unknown as {
  __nexusRepository?: NexusRepository | null;
  __nexusRepositoryPending?: Promise<NexusRepository> | null;
};

export async function getRepository(): Promise<NexusRepository> {
  if (globalCache.__nexusRepository) return globalCache.__nexusRepository;
  if (!globalCache.__nexusRepositoryPending) {
    globalCache.__nexusRepositoryPending = resolveRepository();
  }
  globalCache.__nexusRepository = await globalCache.__nexusRepositoryPending;
  return globalCache.__nexusRepository;
}

async function resolveRepository(): Promise<NexusRepository> {
  const backend = getDataBackend();
  if (backend === "supabase") {
    const { createSupabaseRepository } = await import("./supabase-repository");
    return createSupabaseRepository();
  }
  const { createDemoRepository } = await import("./demo-repository");
  return createDemoRepository({ tenantId: demoTenantId });
}

/** Clear the cached repository (test isolation). */
export function resetRepositoryForTests(): void {
  globalCache.__nexusRepository = null;
  globalCache.__nexusRepositoryPending = null;
}

export { DemoRepository } from "./demo-repository";
export type { DemoRepositoryContext } from "./demo-repository";
export { DEFAULT_LIST_PARAMS } from "./repository";
export type {
  AssetDetail,
  DashboardFreshnessStats,
  DashboardSummary,
  ListFilterValue,
  ListParams,
  ListSort,
  MergeEntitiesInput,
  NexusRepository,
  OrganizationDetail,
  Paged,
  ProductDetail,
  ResearchProjectDetail,
  SearchOptions,
  SearchResult,
  SkuDetail,
  TenderDetail,
} from "./repository";

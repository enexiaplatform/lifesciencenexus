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

let cachedRepository: NexusRepository | null = null;
let pendingRepository: Promise<NexusRepository> | null = null;

export async function getRepository(): Promise<NexusRepository> {
  if (cachedRepository) return cachedRepository;
  if (!pendingRepository) {
    pendingRepository = resolveRepository();
  }
  cachedRepository = await pendingRepository;
  return cachedRepository;
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
  cachedRepository = null;
  pendingRepository = null;
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

"use server";

import { getRepository } from "@/lib/data";
import type { SearchResult } from "@/lib/data/repository";

/**
 * Live preview for the topbar quick-search: top matches across every
 * searchable entity type. Kept tiny (limit 8) — the full federated result
 * set lives on /search.
 */
export async function quickSearchAction(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];
  const repo = await getRepository();
  return repo.search(trimmed, { limit: 8 });
}

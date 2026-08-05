import type { Metadata } from "next";

import { matchCategories, type CategoryMatch } from "@/components/products/categories";
import { SearchClient } from "@/components/search/search-client";
import { getRepository } from "@/lib/data";
import type { SearchResult } from "@/lib/data/repository";
import { ENTITY_TYPES, type EntityType, type Visibility } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Search" };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function parseTypes(raw: string): EntityType[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is EntityType =>
      (ENTITY_TYPES as readonly string[]).includes(item),
    );
}

function parseVisibility(raw: string): Visibility | "all" {
  return raw === "canonical" || raw === "tenant_private" ? raw : "all";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = first(params.q).trim();
  const types = parseTypes(first(params.types));
  const visibility = parseVisibility(first(params.visibility));

  let results: SearchResult[] = [];
  let categoryMatches: CategoryMatch[] = [];
  if (query.length > 0) {
    const repo = await getRepository();
    const found = await repo.search(query, {
      types: types.length > 0 ? types : undefined,
      limit: 60,
    });
    results =
      visibility === "all"
        ? found
        : found.filter((result) => result.visibility === visibility);
    // Category shelves matched by label/synonym ("closed sterility testing
    // system" → sterility_testing_equipment) — capped at the best two.
    categoryMatches = matchCategories(query).slice(0, 2);
  }

  return (
    <SearchClient
      query={query}
      selectedTypes={types}
      visibility={visibility}
      results={results}
      categoryMatches={categoryMatches}
    />
  );
}

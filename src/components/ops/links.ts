/**
 * Client-safe in-app entity links (no server-only imports).
 * Falls back to the search page for types without a dedicated route.
 */
export function entityHref(entityType: string, id: string): string {
  const routes: Record<string, string> = {
    organization: "/organizations",
    site: "/sites",
    laboratory: "/laboratories",
    person: "/people",
    product: "/products",
    sku: "/skus",
    tender: "/tenders",
    installed_asset: "/installed-base",
    research_project: "/research",
  };
  const base = routes[entityType];
  return base ? `${base}/${id}` : `/search?q=${encodeURIComponent(id)}`;
}

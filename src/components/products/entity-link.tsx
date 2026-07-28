import Link from "next/link";

import type { EntityRef, EntityType } from "@/lib/domain/types";

import { humanize } from "./format";

/** Route prefix per entity type; types without a detail route render as text. */
const ENTITY_ROUTES: Partial<Record<EntityType, string>> = {
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

export function entityHref(entityType: EntityType, entityId: string): string | null {
  const prefix = ENTITY_ROUTES[entityType];
  return prefix ? `${prefix}/${entityId}` : null;
}

/**
 * Link to an entity detail page when the type has a route; otherwise a plain
 * labelled chip. Used for signal related-entities and cross-module links.
 */
export function EntityRefLink({
  entityRef,
  label,
  className,
}: {
  entityRef: EntityRef;
  label?: string | null;
  className?: string;
}) {
  const href = entityHref(entityRef.entityType, entityRef.entityId);
  const text = label ?? `${humanize(entityRef.entityType)} ${entityRef.entityId}`;
  if (!href) {
    return (
      <span className={className ?? "text-xs text-slate-500"} title={entityRef.entityId}>
        {text}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={className ?? "text-xs font-medium text-accent hover:underline"}
      title={`${humanize(entityRef.entityType)} · ${entityRef.entityId}`}
    >
      {text}
    </Link>
  );
}

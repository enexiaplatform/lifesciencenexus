import type { Role } from "./types";

/**
 * Role → action permission matrix.
 *
 * Deliberately simple and total: every role maps to an explicit set of
 * actions, unknown combinations deny. Encoded rules:
 *  - owner: everything, including tenant ownership-level management.
 *  - admin: everything EXCEPT ownership transfer. Ownership transfer is not
 *    modelled as an action at all yet, so `can(admin, *)` is true for every
 *    action in this enum — the restriction is documented here and must be
 *    enforced by a dedicated action (e.g. 'transfer_ownership') when tenant
 *    ownership management is built.
 *  - analyst: canonical write + evidence review + export.
 *  - contributor: private-overlay write only (their quotes, contacts, field notes).
 *  - reviewer: reads canonical, reviews evidence, publishes to canonical
 *    (promotes analyst-written canonical content), exports.
 *  - viewer: read canonical only. Tenant-private data is never exposed to viewers.
 */

export const ACTIONS = [
  "read_canonical",
  "write_canonical",
  "write_private",
  "review_evidence",
  "publish_to_canonical",
  "merge_entities",
  "export_data",
  "manage_tenant",
  "manage_integrations",
  "dismiss_signals",
] as const;
export type Action = (typeof ACTIONS)[number];

const ALL_ACTIONS: readonly Action[] = ACTIONS;

export const ROLE_PERMISSIONS: Readonly<Record<Role, ReadonlySet<Action>>> = {
  owner: new Set(ALL_ACTIONS),
  admin: new Set(ALL_ACTIONS),
  analyst: new Set<Action>([
    "read_canonical",
    "write_canonical",
    "write_private",
    "review_evidence",
    "export_data",
  ]),
  contributor: new Set<Action>(["read_canonical", "write_private", "export_data"]),
  reviewer: new Set<Action>([
    "read_canonical",
    "review_evidence",
    "publish_to_canonical",
    "export_data",
  ]),
  viewer: new Set<Action>(["read_canonical"]),
} as const;

/** True when `role` may perform `action`. Total and side-effect free. */
export function can(role: Role, action: Action): boolean {
  return ROLE_PERMISSIONS[role].has(action);
}

/** True when the role may create/update tenant-private (layer B) records. */
export function isPrivateAllowed(role: Role): boolean {
  return can(role, "write_private");
}

/** True when the role may write to the canonical shared graph. */
export function isCanonicalWriter(role: Role): boolean {
  return can(role, "write_canonical");
}

/** True when the role may advance evidence review states. */
export function isReviewer(role: Role): boolean {
  return can(role, "review_evidence");
}

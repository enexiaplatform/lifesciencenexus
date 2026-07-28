"use server";

import { getRepository } from "@/lib/data";
import type { EntityMergeEvent, EntityType } from "@/lib/domain/types";

/**
 * Server actions for /admin/entity-resolution. Thin wrappers over the
 * repository's entity-resolution queue (demo backend, in-memory).
 */

export interface MergeActionInput {
  entityType: EntityType;
  survivorId: string;
  mergedId: string;
  /** Per-field side overrides; "left" = survivor, "right" = merged (repo convention). */
  fieldChoices: Record<string, "left" | "right">;
}

/** Merge two entities: loser archived, names preserved as aliases, redirect kept. */
export async function mergeEntitiesAction(input: MergeActionInput): Promise<EntityMergeEvent> {
  const repo = await getRepository();
  return repo.mergeEntities(input);
}

/** Mark a duplicate candidate as "not a duplicate". */
export async function dismissCandidateAction(id: string) {
  const repo = await getRepository();
  return repo.dismissDuplicateCandidate(id);
}

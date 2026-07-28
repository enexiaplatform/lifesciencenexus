"use server";

import { getRepository } from "@/lib/data";
import { demoTenantId } from "@/lib/env";
import {
  findImportDuplicates,
  runImport,
  type ImportDuplicateHit,
  type RunImportResult,
} from "@/lib/imports/run";
import type { ImportKind } from "@/lib/imports/templates";
import type { Visibility } from "@/lib/domain/types";

/**
 * Server actions for the /imports wizard. The heavy lifting lives in
 * `@/lib/imports/run` (unit-tested); these wrap it with the demo tenant
 * context. Arguments and results stay JSON-serializable.
 */

export interface RunImportActionInput {
  kind: ImportKind;
  rows: Record<string, string>[];
  fileName: string;
  visibility: Visibility;
  importValidOnly: boolean;
  skipRowIndexes: number[];
}

/** Score rows against existing organizations/SKUs for the duplicate-review step. */
export async function checkImportDuplicatesAction(
  kind: ImportKind,
  rows: Record<string, string>[],
): Promise<ImportDuplicateHit[]> {
  const repo = await getRepository();
  return findImportDuplicates(repo, kind, rows);
}

/** Commit an import batch: validate, resolve references, dedup, create, audit. */
export async function runImportAction(input: RunImportActionInput): Promise<RunImportResult> {
  const repo = await getRepository();
  return runImport(repo, {
    ...input,
    tenantId: demoTenantId,
    actorId: "user_demo_owner",
  });
}

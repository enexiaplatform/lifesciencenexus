import type { EntityType, MergeFieldResolution, OrganizationIdentifier } from "./types";

/**
 * Entity-resolution engine: duplicate scoring and merge planning for
 * organizations, products and SKUs.
 *
 * Deterministic and explainable — every score decomposes into named signals
 * (`matchedOn`), nothing merges silently, and merges preserve the loser's
 * names as aliases plus a redirect so existing links keep working.
 */

export interface DuplicateEntityInput {
  id: string;
  name: string;
  aliases?: string[];
  identifiers?: OrganizationIdentifier[];
  catalogueNumber?: string;
  /** Website domain, e.g. 'merckmillipore.com'. */
  domain?: string;
  /** Free-text address/city/province for similarity. */
  address?: string;
}

export interface DuplicateScoreResult {
  /** 0–1 weighted score over the applicable signals. */
  score: number;
  /** Human-readable explanations, e.g. 'name token overlap 0.80'. */
  matchedOn: string[];
  /** Raw signal values for transparency/debugging. */
  components: Record<string, number>;
}

/** Legal-form stopwords removed before token comparison (incl. Vietnamese forms). */
const LEGAL_STOPWORDS = new Set([
  "ltd", "llc", "jsc", "co", "company", "corp", "corporation", "inc",
  "gmbh", "pte", "sdn", "bhd", "sa", "bv", "ooo", "pty", "llp", "plc",
  // Vietnamese: 'Công ty TNHH' (LLC), 'Cổ phần' (JSC)
  "cong", "ty", "tnhh", "cp", "phan",
]);

/** Lowercase, strip diacritics, punctuation → spaces, collapse whitespace. */
export function normalizeForMatch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nameTokens(text: string): Set<string> {
  return new Set(normalizeForMatch(text).split(" ").filter((t) => t.length > 0 && !LEGAL_STOPWORDS.has(t)));
}

/** Jaccard similarity of two token sets; 0 when either side is empty. */
export function tokenJaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

/** Uppercase alphanumeric-only form for catalogue numbers / GTINs. */
function normalizeCode(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

interface Signal {
  name: string;
  weight: number;
  /** Undefined when the signal is not applicable to this pair. */
  value: number | undefined;
  reason?: string;
}

const WEIGHTS = {
  name: 0.45,
  alias: 0.2,
  identifier: 0.3,
  catalogue: 0.3,
  domain: 0.15,
  address: 0.1,
} as const;

/**
 * Score one pair. The weighted average is computed over APPLICABLE signals
 * only (a signal needs data on both sides); a single strong exact-identifier
 * match therefore scores high, which is the desired behavior — but it will
 * say exactly why in `matchedOn`.
 */
export function scoreDuplicatePair(a: DuplicateEntityInput, b: DuplicateEntityInput): DuplicateScoreResult {
  const matchedOn: string[] = [];
  const components: Record<string, number> = {};

  const nameSim = tokenJaccard(nameTokens(a.name), nameTokens(b.name));
  components.name = round2(nameSim);
  if (nameSim > 0) matchedOn.push(`name token overlap ${round2(nameSim).toFixed(2)}`);

  const aAliases = a.aliases ?? [];
  const bAliases = b.aliases ?? [];
  const aliasApplicable = aAliases.length > 0 || bAliases.length > 0;
  const aliasHit =
    aliasApplicable &&
    (exactIn(a.name, bAliases) || exactIn(b.name, aAliases) || intersects(aAliases, bAliases));
  if (aliasApplicable) {
    components.alias = aliasHit ? 1 : 0;
    if (aliasHit) matchedOn.push("alias exact match");
  }

  const identifierHitScheme = matchingIdentifierScheme(a.identifiers ?? [], b.identifiers ?? []);
  const identifierApplicable = (a.identifiers?.length ?? 0) > 0 && (b.identifiers?.length ?? 0) > 0;
  if (identifierApplicable) {
    components.identifier = identifierHitScheme ? 1 : 0;
    if (identifierHitScheme) matchedOn.push(`identifier exact match (${identifierHitScheme})`);
  }

  const catalogueApplicable = Boolean(a.catalogueNumber) && Boolean(b.catalogueNumber);
  const catalogueHit =
    catalogueApplicable && normalizeCode(a.catalogueNumber ?? "") === normalizeCode(b.catalogueNumber ?? "");
  if (catalogueApplicable) {
    components.catalogue = catalogueHit ? 1 : 0;
    if (catalogueHit) matchedOn.push("catalogue number match");
  }

  const domainApplicable = Boolean(a.domain) && Boolean(b.domain);
  const domainHit = domainApplicable && a.domain?.toLowerCase() === b.domain?.toLowerCase();
  if (domainApplicable) {
    components.domain = domainHit ? 1 : 0;
    if (domainHit) matchedOn.push("domain match");
  }

  const addressApplicable = Boolean(a.address) && Boolean(b.address);
  const addressSim = addressApplicable
    ? tokenJaccard(new Set(normalizeForMatch(a.address ?? "").split(" ")), new Set(normalizeForMatch(b.address ?? "").split(" ")))
    : undefined;
  if (addressSim !== undefined) {
    components.address = round2(addressSim);
    if (addressSim > 0) matchedOn.push(`address token overlap ${round2(addressSim).toFixed(2)}`);
  }

  const signals: Signal[] = [
    { name: "name", weight: WEIGHTS.name, value: nameSim },
    { name: "alias", weight: WEIGHTS.alias, value: aliasApplicable ? (aliasHit ? 1 : 0) : undefined },
    {
      name: "identifier",
      weight: WEIGHTS.identifier,
      value: identifierApplicable ? (identifierHitScheme ? 1 : 0) : undefined,
    },
    {
      name: "catalogue",
      weight: WEIGHTS.catalogue,
      value: catalogueApplicable ? (catalogueHit ? 1 : 0) : undefined,
    },
    { name: "domain", weight: WEIGHTS.domain, value: domainApplicable ? (domainHit ? 1 : 0) : undefined },
    { name: "address", weight: WEIGHTS.address, value: addressSim },
  ];

  let weightSum = 0;
  let total = 0;
  for (const signal of signals) {
    if (signal.value === undefined) continue;
    weightSum += signal.weight;
    total += signal.weight * signal.value;
  }
  const score = weightSum > 0 ? total / weightSum : 0;
  return { score: Math.round(score * 1000) / 1000, matchedOn, components };
}

function exactIn(name: string, aliases: readonly string[]): boolean {
  const normalized = normalizeForMatch(name);
  return aliases.some((alias) => normalizeForMatch(alias) === normalized);
}

function intersects(a: readonly string[], b: readonly string[]): boolean {
  const bNorm = new Set(b.map(normalizeForMatch));
  return a.some((value) => bNorm.has(normalizeForMatch(value)));
}

function matchingIdentifierScheme(
  a: readonly OrganizationIdentifier[],
  b: readonly OrganizationIdentifier[],
): string | null {
  for (const left of a) {
    for (const right of b) {
      if (left.scheme === right.scheme && normalizeCode(left.value) === normalizeCode(right.value)) {
        return left.scheme;
      }
    }
  }
  return null;
}

export interface DuplicatePair {
  leftId: string;
  rightId: string;
  score: number;
  matchedOn: string[];
}

export const DEFAULT_DUPLICATE_THRESHOLD = 0.65;

/** All pairs at or above `threshold`, sorted by score desc (ids as tiebreak). O(n²). */
export function findDuplicateCandidates(
  entities: readonly DuplicateEntityInput[],
  threshold: number = DEFAULT_DUPLICATE_THRESHOLD,
): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  for (let i = 0; i < entities.length; i += 1) {
    for (let j = i + 1; j < entities.length; j += 1) {
      const result = scoreDuplicatePair(entities[i], entities[j]);
      if (result.score >= threshold) {
        pairs.push({
          leftId: entities[i].id,
          rightId: entities[j].id,
          score: result.score,
          matchedOn: result.matchedOn,
        });
      }
    }
  }
  return pairs.sort(
    (a, b) => b.score - a.score || a.leftId.localeCompare(b.leftId) || a.rightId.localeCompare(b.rightId),
  );
}

// ---------------------------------------------------------------------------
// Merge planning
// ---------------------------------------------------------------------------

export interface MergePlan {
  entityType: EntityType;
  survivorId: string;
  mergedId: string;
  /** Per-field decision: which side's value survives. */
  fieldResolutions: Record<string, MergeFieldResolution>;
  /** Loser's name(s) preserved on the survivor — old quotes/documents still resolve. */
  aliasesToAdd: string[];
  aliasPreservation: true;
  redirectCreated: true;
  redirect: { fromId: string; toId: string };
}

/** Fields never carried into a merge plan. */
const MERGE_EXCLUDED_FIELDS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
  "archivedAt",
  "aliases",
  "alternateNames",
]);

/**
 * Build a deterministic merge plan. `survivor` picks the winning side;
 * `fieldChoices` overrides per field (default: survivor's value wins).
 * Pure — applying the plan is the repository's job.
 */
export function buildMergePlan<T extends { id: string; name?: string; aliases?: string[] }>(options: {
  entityType: EntityType;
  left: T;
  right: T;
  survivor: "left" | "right";
  fieldChoices?: Record<string, "left" | "right">;
}): MergePlan {
  const { entityType, left, right, survivor, fieldChoices = {} } = options;
  const winner = survivor === "left" ? left : right;
  const loser = survivor === "left" ? right : left;

  // Both T and Record access are needed; the cast is safe because T is a plain
  // data entity (no methods) by domain convention.
  const leftRecord = left as unknown as Record<string, unknown>;
  const rightRecord = right as unknown as Record<string, unknown>;

  const fields: string[] = [];
  for (const key of Object.keys(leftRecord)) {
    if (!MERGE_EXCLUDED_FIELDS.has(key) && !fields.includes(key)) fields.push(key);
  }
  for (const key of Object.keys(rightRecord)) {
    if (!MERGE_EXCLUDED_FIELDS.has(key) && !fields.includes(key)) fields.push(key);
  }

  const fieldResolutions: Record<string, MergeFieldResolution> = {};
  for (const field of fields) {
    const choice = fieldChoices[field] ?? survivor;
    fieldResolutions[field] = {
      chosen: choice,
      value: choice === "left" ? leftRecord[field] : rightRecord[field],
    };
  }

  const winnerNames = new Set(
    [winner.name, ...(winner.aliases ?? [])].filter((n): n is string => n !== undefined).map(normalizeForMatch),
  );
  const aliasesToAdd: string[] = [];
  for (const candidate of [loser.name, ...(loser.aliases ?? [])]) {
    if (candidate === undefined) continue;
    const normalized = normalizeForMatch(candidate);
    if (!winnerNames.has(normalized) && !aliasesToAdd.some((a) => normalizeForMatch(a) === normalized)) {
      aliasesToAdd.push(candidate);
    }
  }

  return {
    entityType,
    survivorId: winner.id,
    mergedId: loser.id,
    fieldResolutions,
    aliasesToAdd,
    aliasPreservation: true,
    redirectCreated: true,
    redirect: { fromId: loser.id, toId: winner.id },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

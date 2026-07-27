import { normalizeForMatch, tokenJaccard } from "./entity-resolution";

/**
 * Federated search ranker (demo backend and client-side re-ranking).
 *
 * Combines token overlap, trigram Dice similarity (typo tolerance), and exact
 * catalogue/alias/identifier boosts. Zero dependencies, fully deterministic,
 * and every result carries `matchReasons` so the UI can explain why a record
 * ranked where it did.
 */

export interface SearchableRecord {
  entityType: string;
  id: string;
  name: string;
  aliases?: string[];
  catalogueNumber?: string;
  identifiers?: { scheme: string; value: string }[];
}

export interface RankedSearchResult<T extends SearchableRecord = SearchableRecord> {
  record: T;
  score: number;
  matchReasons: string[];
}

export interface RankSearchOptions {
  /** Max results returned. Default 20. */
  limit?: number;
  /** Minimum score to include. Default 0.2. */
  minScore?: number;
}

/** Uppercase alphanumeric-only form for catalogue numbers / GTINs / identifiers. */
function normalizeCode(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

/** Trigram multiset (padded with spaces); short strings degrade to a single gram. */
function trigrams(text: string): Set<string> {
  if (text.length <= 3) return new Set([text]);
  const padded = `  ${text} `;
  const grams = new Set<string>();
  for (let i = 0; i <= padded.length - 3; i += 1) {
    grams.add(padded.slice(i, i + 3));
  }
  return grams;
}

/** Dice coefficient over trigram sets: 2·|A∩B| / (|A|+|B|). 0 for empty input. */
export function trigramDice(a: string, b: string): number {
  if (a.length === 0 || b.length === 0) return 0;
  const gramsA = trigrams(a);
  const gramsB = trigrams(b);
  let intersection = 0;
  for (const gram of gramsA) {
    if (gramsB.has(gram)) intersection += 1;
  }
  return (2 * intersection) / (gramsA.size + gramsB.size);
}

const EXACT_NAME_SCORE = 1;
const EXACT_CATALOGUE_SCORE = 0.99;
const EXACT_ALIAS_SCORE = 0.98;
const EXACT_IDENTIFIER_SCORE = 0.97;
const NAME_PREFIX_BOOST = 0.15;
const ALIAS_PREFIX_BOOST = 0.1;

export function rankSearchResults<T extends SearchableRecord>(
  query: string,
  records: readonly T[],
  options: RankSearchOptions = {},
): Array<RankedSearchResult<T>> {
  const limit = options.limit ?? 20;
  const minScore = options.minScore ?? 0.2;

  const queryNorm = normalizeForMatch(query);
  const queryCode = normalizeCode(query);
  if (queryNorm.length === 0) return [];

  const queryTokens = new Set(queryNorm.split(" ").filter(Boolean));
  const results: Array<RankedSearchResult<T>> = [];

  for (const record of records) {
    const nameNorm = normalizeForMatch(record.name);
    const aliasNorms = (record.aliases ?? []).map(normalizeForMatch);
    const reasons: string[] = [];

    // --- Exact-match signals -------------------------------------------------
    let exactScore = 0;
    if (nameNorm === queryNorm) {
      exactScore = Math.max(exactScore, EXACT_NAME_SCORE);
      reasons.push("name exact match");
    }
    if (record.catalogueNumber && queryCode.length > 0 && normalizeCode(record.catalogueNumber) === queryCode) {
      exactScore = Math.max(exactScore, EXACT_CATALOGUE_SCORE);
      reasons.push("catalogue number match");
    }
    if (aliasNorms.some((alias) => alias === queryNorm)) {
      exactScore = Math.max(exactScore, EXACT_ALIAS_SCORE);
      reasons.push("alias exact match");
    }
    for (const identifier of record.identifiers ?? []) {
      if (queryCode.length > 0 && normalizeCode(identifier.value) === queryCode) {
        exactScore = Math.max(exactScore, EXACT_IDENTIFIER_SCORE);
        reasons.push(`identifier exact match (${identifier.scheme})`);
        break;
      }
    }

    // --- Fuzzy base: best of token overlap, name trigram, alias trigram --------
    const nameTokens = new Set(nameNorm.split(" ").filter(Boolean));
    const overlap = tokenJaccard(queryTokens, nameTokens);
    const nameDice = trigramDice(queryNorm, nameNorm);
    let bestAliasDice = 0;
    for (const alias of aliasNorms) {
      bestAliasDice = Math.max(bestAliasDice, trigramDice(queryNorm, alias));
    }
    let base = 0;
    if (overlap >= nameDice && overlap >= bestAliasDice && overlap > 0) {
      base = overlap;
      reasons.push(`token overlap ${overlap.toFixed(2)}`);
    } else if (nameDice >= bestAliasDice && nameDice > 0) {
      base = nameDice;
      reasons.push(`name ~${nameDice.toFixed(2)} similarity`);
    } else if (bestAliasDice > 0) {
      base = bestAliasDice;
      reasons.push(`alias ~${bestAliasDice.toFixed(2)} similarity`);
    }

    // --- Prefix boosts -----------------------------------------------------------
    let boost = 0;
    if (queryNorm.length >= 2 && nameNorm !== queryNorm && nameNorm.startsWith(queryNorm)) {
      boost += NAME_PREFIX_BOOST;
      reasons.push("name prefix match");
    }
    if (queryNorm.length >= 2 && aliasNorms.some((a) => a !== queryNorm && a.startsWith(queryNorm))) {
      boost += ALIAS_PREFIX_BOOST;
      reasons.push("alias prefix match");
    }

    const score = Math.min(1, Math.max(exactScore, base) + boost);
    if (score < minScore) continue;

    results.push({ record, score: Math.round(score * 1000) / 1000, matchReasons: reasons });
  }

  return results
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.record.name.localeCompare(b.record.name) ||
        a.record.id.localeCompare(b.record.id),
    )
    .slice(0, limit);
}

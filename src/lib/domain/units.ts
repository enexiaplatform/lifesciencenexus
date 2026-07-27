/**
 * Pack-string parsing and unit math for price normalization and cost-per-test.
 *
 * Supported families: mass (mg/g/kg), volume (µL/mL/L), count-like units
 * (pcs/plate/bottle/vial/test/pack/box/tube/dish/bag — each its own base,
 * because a plate and a bottle are not interchangeable), and length
 * (mm/cm/m — used only for pack dimensions like "10x90 mm").
 *
 * Everything is pure and explicit: unknown units never throw, they produce
 * `null` or carry a warning, so bad data cannot silently become a number.
 */

export const UNIT_FAMILIES = ["mass", "volume", "count", "length", "unknown"] as const;
export type UnitFamily = (typeof UNIT_FAMILIES)[number];

interface UnitDef {
  /** Canonical display symbol. */
  symbol: string;
  family: Exclude<UnitFamily, "unknown">;
  /** Multiplier to the family base unit (g, mL, mm). Count units are 1 and keep their own symbol. */
  toBase: number;
}

const UNIT_TABLE: Readonly<Record<string, UnitDef>> = (() => {
  const entries: Array<[string[], UnitDef]> = [
    [["g", "gram", "grams"], { symbol: "g", family: "mass", toBase: 1 }],
    [["kg", "kilogram", "kilograms", "kgs"], { symbol: "kg", family: "mass", toBase: 1000 }],
    [["mg", "milligram", "milligrams"], { symbol: "mg", family: "mass", toBase: 0.001 }],
    [["ml", "milliliter", "milliliters", "millilitre", "millilitres"], { symbol: "mL", family: "volume", toBase: 1 }],
    [["l", "liter", "liters", "litre", "litres"], { symbol: "L", family: "volume", toBase: 1000 }],
    [["µl", "ul", "microliter", "microliters", "microlitre", "microlitres"], { symbol: "µL", family: "volume", toBase: 0.001 }],
    [["mm", "millimeter", "millimeters"], { symbol: "mm", family: "length", toBase: 1 }],
    [["cm", "centimeter", "centimeters"], { symbol: "cm", family: "length", toBase: 10 }],
    [["m", "meter", "meters", "metre", "metres"], { symbol: "m", family: "length", toBase: 1000 }],
  ];
  const countUnits = [
    "pc", "pcs", "piece", "pieces", "plate", "plates", "bottle", "bottles",
    "vial", "vials", "test", "tests", "pack", "packs", "box", "boxes",
    "unit", "units", "tube", "tubes", "dish", "dishes", "bag", "bags",
  ];
  const table: Record<string, UnitDef> = {};
  for (const [keys, def] of entries) {
    for (const key of keys) table[key] = def;
  }
  for (const unit of countUnits) {
    // Singular form is the canonical symbol ('plates' -> 'plate').
    const symbol = unit.endsWith("s") && !unit.endsWith("ss") ? unit.replace(/s$/, "") : unit;
    table[unit] = { symbol, family: "count", toBase: 1 };
  }
  return table;
})();

/** Look up a unit (case-insensitive, surrounding whitespace ignored). Null when unknown. */
export function normalizeUnit(unit: string): { symbol: string; family: UnitFamily } | null {
  const def = UNIT_TABLE[unit.trim().toLowerCase()];
  return def ? { symbol: def.symbol, family: def.family } : null;
}

export interface BaseQuantity {
  /** Quantity expressed in the family base unit. */
  quantity: number;
  /** 'g' | 'mL' | 'mm' | the count unit itself ('plate', 'bottle', …). */
  baseUnit: string;
  family: UnitFamily;
}

/**
 * Convert a quantity to its family base unit. Count units convert 1:1 and keep
 * their own symbol. Returns null for unknown units.
 */
export function toBaseUnits(quantity: number, unit: string): BaseQuantity | null {
  const def = UNIT_TABLE[unit.trim().toLowerCase()];
  if (!def) return null;
  let baseUnit: string;
  switch (def.family) {
    case "mass":
      baseUnit = "g";
      break;
    case "volume":
      baseUnit = "mL";
      break;
    case "length":
      baseUnit = "mm";
      break;
    case "count":
      baseUnit = def.symbol;
      break;
  }
  return { quantity: quantity * def.toBase, baseUnit, family: def.family };
}

/**
 * Convert between two units of the same family. Cross-family conversion and
 * unknown units return null — there is no silent conversion in Nexus.
 */
export function convertQuantity(quantity: number, fromUnit: string, toUnit: string): number | null {
  const from = UNIT_TABLE[fromUnit.trim().toLowerCase()];
  const to = UNIT_TABLE[toUnit.trim().toLowerCase()];
  if (!from || !to || from.family !== to.family) return null;
  // Count units only convert to themselves (1 plate ≠ 1 bottle).
  if (from.family === "count" && from.symbol !== to.symbol) return null;
  return (quantity * from.toBase) / to.toBase;
}

/**
 * A parsed pack, uniform across families:
 * `total = itemCount × perItemQuantity` (in `unit`).
 *
 *  - '500 g'          -> itemCount 1,  perItemQuantity 500 g
 *  - '6 x 500 g'      -> itemCount 6,  perItemQuantity 500 g
 *  - '20 plates/pack' -> itemCount 20, perItemQuantity 1 plate
 *  - '24 tests'       -> itemCount 24, perItemQuantity 1 test
 *  - '6 x 24 tests'   -> itemCount 144, perItemQuantity 1 test
 *  - '10x90 mm'       -> itemCount 10, dimension 90 mm (content amount unknown)
 */
export interface ParsedPack {
  /** Number of items in the pack. */
  itemCount: number;
  /** Content amount per item, in `unit`. */
  perItemQuantity: number;
  /** Canonical unit symbol ('g', 'plate', 'mm', …). */
  unit: string;
  family: UnitFamily;
  /** Set when the pack is described by a dimension ('10x90 mm'). */
  dimension?: { quantity: number; unit: string };
}

const NUMBER = "(\\d+(?:\\.\\d+)?)";
const UNIT_RE = "([a-zA-Zµ]+)";
const MULTIPLIER_RE = new RegExp(`^${NUMBER}\\s*[x×]\\s*${NUMBER}\\s*${UNIT_RE}$`, "i");
const PER_PACK_RE = new RegExp(`^${NUMBER}\\s*${UNIT_RE}\\s*\\/\\s*pack$`, "i");
const SIMPLE_RE = new RegExp(`^${NUMBER}\\s*${UNIT_RE}$`, "i");

function countPack(totalItems: number, unit: string): ParsedPack {
  return { itemCount: totalItems, perItemQuantity: 1, unit, family: "count" };
}

/**
 * Parse pack strings like '500 g', '500g', '20 plates/pack', '10x90 mm',
 * '6 x 500 g'. Returns null when the string is not a recognizable pack.
 */
export function parsePack(text: string): ParsedPack | null {
  const cleaned = text.trim().replace(/,/g, "");

  const multiplier = MULTIPLIER_RE.exec(cleaned);
  if (multiplier) {
    const count = Number(multiplier[1]);
    const quantity = Number(multiplier[2]);
    const lookedUp = normalizeUnit(multiplier[3]);
    if (!lookedUp) return null;
    if (lookedUp.family === "length") {
      return {
        itemCount: count,
        perItemQuantity: quantity,
        unit: lookedUp.symbol,
        family: "length",
        dimension: { quantity, unit: lookedUp.symbol },
      };
    }
    if (lookedUp.family === "count") {
      return countPack(count * quantity, lookedUp.symbol);
    }
    return { itemCount: count, perItemQuantity: quantity, unit: lookedUp.symbol, family: lookedUp.family };
  }

  const perPack = PER_PACK_RE.exec(cleaned);
  if (perPack) {
    const quantity = Number(perPack[1]);
    const lookedUp = normalizeUnit(perPack[2]);
    if (!lookedUp) return null;
    if (lookedUp.family === "count") return countPack(quantity, lookedUp.symbol);
    return { itemCount: 1, perItemQuantity: quantity, unit: lookedUp.symbol, family: lookedUp.family };
  }

  const simple = SIMPLE_RE.exec(cleaned);
  if (simple) {
    const quantity = Number(simple[1]);
    const lookedUp = normalizeUnit(simple[2]);
    if (!lookedUp) return null;
    if (lookedUp.family === "count") return countPack(quantity, lookedUp.symbol);
    return { itemCount: 1, perItemQuantity: quantity, unit: lookedUp.symbol, family: lookedUp.family };
  }

  return null;
}

export interface NormalizedPack {
  family: UnitFamily;
  /**
   * Base unit of `totalBaseQuantity`: 'g', 'mL', the count unit itself
   * ('plate', 'bottle', …), or 'unit' for dimension-only packs.
   */
  baseUnit: string;
  /** Total pack content in base units: `itemCount × perItemBaseQuantity`. */
  totalBaseQuantity: number;
  /** Number of items in the pack. */
  itemCount: number;
  /** Per-item content in base units (1 for plain count packs). */
  perItemBaseQuantity: number;
  /** Pack dimension when present ('10x90 mm'). */
  dimension?: { quantity: number; unit: string };
  /** Normalized human-readable label, e.g. '500 g', '3000 g', '20 plate'. */
  label: string;
  /** Every assumption made while normalizing — never silent. */
  warnings: string[];
}

export interface NormalizePackObjectInput {
  quantity: number;
  unit: string;
  unitsPerPack?: number;
}

/**
 * Normalize a pack (string form or structured form) into base units.
 * Structured form: `{ quantity: 500, unit: 'g', unitsPerPack: 6 }` is the
 * '6 x 500 g' case; `{ quantity: 20, unit: 'plates' }` is 20 plates.
 * Returns null when the unit is unknown or quantities are not positive.
 */
export function normalizePack(input: string | NormalizePackObjectInput): NormalizedPack | null {
  const parsed =
    typeof input === "string"
      ? parsePack(input)
      : (() => {
          const lookedUp = normalizeUnit(input.unit);
          if (!lookedUp) return null;
          if (lookedUp.family === "count") {
            return countPack(input.quantity * (input.unitsPerPack ?? 1), lookedUp.symbol);
          }
          return {
            itemCount: input.unitsPerPack ?? 1,
            perItemQuantity: input.quantity,
            unit: lookedUp.symbol,
            family: lookedUp.family,
          } satisfies ParsedPack;
        })();
  if (!parsed) return null;
  if (parsed.perItemQuantity <= 0 || parsed.itemCount <= 0) return null;

  if (parsed.dimension) {
    return {
      family: "count",
      baseUnit: "unit",
      totalBaseQuantity: parsed.itemCount,
      itemCount: parsed.itemCount,
      perItemBaseQuantity: 1,
      dimension: parsed.dimension,
      label: `${parsed.itemCount} × (${parsed.dimension.quantity} ${parsed.dimension.unit})`,
      warnings: [
        `Interpreted dimension pack as ${parsed.itemCount} items of ${parsed.dimension.quantity} ${parsed.dimension.unit}; content amount per item unknown`,
      ],
    };
  }

  const base = toBaseUnits(parsed.perItemQuantity, parsed.unit);
  if (!base) return null;

  const totalBaseQuantity = base.quantity * parsed.itemCount;
  return {
    family: parsed.family,
    baseUnit: base.baseUnit,
    totalBaseQuantity,
    itemCount: parsed.itemCount,
    perItemBaseQuantity: base.quantity,
    label: `${totalBaseQuantity} ${base.baseUnit}`,
    warnings: [],
  };
}

/**
 * Price per base unit: `amount / totalBaseQuantity`. Null when the pack has
 * no positive content amount. Full precision — rounding is a UI concern.
 */
export function pricePerUnit(amount: number, pack: NormalizedPack): number | null {
  if (!Number.isFinite(amount) || pack.totalBaseQuantity <= 0) return null;
  return amount / pack.totalBaseQuantity;
}

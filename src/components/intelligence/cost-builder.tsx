"use client";

import { useMemo, useState, useTransition } from "react";
import { Calculator, Download, Save, Trash2 } from "lucide-react";

import { Combobox } from "@/components/products/combobox";
import { downloadText } from "@/components/products/download";
import { formatMoney, formatNumber } from "@/components/products/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateCostPerTest,
  runSensitivity,
  SENSITIVITY_PARAMETERS,
  type CostPerTestResult,
  type SensitivityParameter,
} from "@/lib/domain/cost-per-test";
import { toCsv, toJsonExport } from "@/lib/domain/export";
import type { CostPerTestInput } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

import { CostBarChart } from "./cost-bar-chart";

export interface CostSkuOption {
  id: string;
  name: string;
  catalogueNumber: string | null;
  packDescription: string | null;
  normalizedPackLabel: string | null;
  /** Normalized pack content in base units (prefill for packQuantity/packUnit). */
  packQuantity: number | null;
  packUnit: string | null;
  latestPrice: {
    id: string;
    amount: number;
    currency: string;
    vatRate: number | null;
    taxIncluded: boolean;
    date: string;
  } | null;
}

export interface SavedScenarioOption {
  id: string;
  name: string;
  skuId: string | null;
  input: CostPerTestInput;
}

export interface ProjectOption {
  id: string;
  title: string;
}

export type SaveCostScenarioAction = (input: {
  name: string;
  projectId?: string;
  scenarios: Array<{ skuId: string; priceObservationId?: string; input: CostPerTestInput }>;
}) => Promise<{ ok: true; count: number } | { ok: false; error: string }>;

// ---------------------------------------------------------------------------
// Card state (all inputs are strings; parsing happens at calculate time)
// ---------------------------------------------------------------------------

interface CardState {
  key: string;
  skuId: string;
  priceObservationId: string | null;
  price: string;
  currency: string;
  packQuantity: string;
  packUnit: string;
  yieldPerUnit: string;
  taxIncluded: boolean;
  freight: string;
  importDutyRatePct: string;
  vatRatePct: string;
  coldChain: string;
  storage: string;
  preparationMaterials: string;
  water: string;
  laborMinutes: string;
  laborRate: string;
  equipmentAllocation: string;
  qcGpt: string;
  sterilization: string;
  wasteRatePct: string;
  failureRepeatRatePct: string;
  disposal: string;
  validation: string;
  service: string;
}

const MONEY_FIELDS = [
  { key: "freight", label: "Freight / pack", input: "freight" },
  { key: "coldChain", label: "Cold chain / pack", input: "coldChain" },
  { key: "storage", label: "Storage / pack", input: "storage" },
  { key: "preparationMaterials", label: "Preparation materials / test", input: "preparationMaterials" },
  { key: "water", label: "Water / test", input: "water" },
  { key: "equipmentAllocation", label: "Equipment allocation / test", input: "equipmentAllocationPerTest" },
  { key: "qcGpt", label: "QC growth-promotion / test", input: "qcGptPerTest" },
  { key: "sterilization", label: "Sterilization / test", input: "sterilizationPerTest" },
  { key: "disposal", label: "Disposal / test", input: "disposalPerTest" },
  { key: "validation", label: "Validation (amortized) / test", input: "validationCostAmortized" },
  { key: "service", label: "Service / test", input: "serviceCostPerTest" },
] as const;

const RATE_FIELDS = [
  { key: "importDutyRatePct", label: "Import duty %", input: "importDutyRate" },
  { key: "vatRatePct", label: "VAT %", input: "vatRate" },
  { key: "wasteRatePct", label: "Waste rate %", input: "wasteRate" },
  { key: "failureRepeatRatePct", label: "Failure repeat rate %", input: "failureRepeatRate" },
] as const;

interface FxState {
  from: string;
  to: string;
  rate: string;
  rateDate: string;
  source: string;
}

interface CalculatedScenario {
  key: string;
  skuId: string;
  skuName: string;
  priceObservationId: string | null;
  input: CostPerTestInput | null;
  result: CostPerTestResult | null;
  error: string | null;
}

let cardCounter = 0;
const nextKey = () => `card-${++cardCounter}`;

const emptyCard = (): CardState => ({
  key: nextKey(),
  skuId: "",
  priceObservationId: null,
  price: "",
  currency: "VND",
  packQuantity: "",
  packUnit: "",
  yieldPerUnit: "",
  taxIncluded: false,
  freight: "",
  importDutyRatePct: "",
  vatRatePct: "",
  coldChain: "",
  storage: "",
  preparationMaterials: "",
  water: "",
  laborMinutes: "",
  laborRate: "",
  equipmentAllocation: "",
  qcGpt: "",
  sterilization: "",
  wasteRatePct: "",
  failureRepeatRatePct: "",
  disposal: "",
  validation: "",
  service: "",
});

function parseNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/**
 * Scenario builder: per-SKU cost stacks computed with the cost-per-test
 * engine, a single explicit FX snapshot when currencies differ, sensitivity
 * analysis, save-to-research-project, and CSV/JSON export. Assumptions
 * produced by the engine are always visible next to the results.
 */
export function CostBuilder({
  skuOptions,
  savedScenarios,
  projects,
  saveScenario,
}: {
  skuOptions: CostSkuOption[];
  savedScenarios: SavedScenarioOption[];
  projects: ProjectOption[];
  saveScenario: SaveCostScenarioAction;
}) {
  const [name, setName] = useState("");
  const [cards, setCards] = useState<CardState[]>([]);
  const [pickerValue, setPickerValue] = useState<string | null>(null);
  const [fx, setFx] = useState<FxState>({ from: "", to: "", rate: "", rateDate: "", source: "" });
  const [calculated, setCalculated] = useState<CalculatedScenario[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [projectId, setProjectId] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [sensitivity, setSensitivity] = useState<{ cardKey: string; parameter: SensitivityParameter } | null>(null);
  const [pending, startTransition] = useTransition();

  const optionById = useMemo(() => new Map(skuOptions.map((option) => [option.id, option])), [skuOptions]);

  const addCard = (skuId: string | null) => {
    if (!skuId || cards.some((card) => card.skuId === skuId)) return;
    const option = optionById.get(skuId);
    const card = emptyCard();
    card.skuId = skuId;
    if (option) {
      if (option.packQuantity !== null && option.packUnit) {
        card.packQuantity = String(option.packQuantity);
        card.packUnit = option.packUnit;
      }
      if (option.latestPrice) {
        card.price = String(option.latestPrice.amount);
        card.currency = option.latestPrice.currency;
        card.taxIncluded = option.latestPrice.taxIncluded;
        card.priceObservationId = option.latestPrice.id;
        if (option.latestPrice.vatRate !== null) {
          card.vatRatePct = String(option.latestPrice.vatRate * 100);
        }
      }
    }
    setCards((current) => [...current, card]);
    setCalculated(null);
  };

  const updateCard = (key: string, patch: Partial<CardState>) => {
    setCards((current) =>
      current.map((card) => (card.key === key ? { ...card, ...patch } : card)),
    );
    setCalculated(null);
  };

  const removeCard = (key: string) => {
    setCards((current) => current.filter((card) => card.key !== key));
    setCalculated(null);
  };

  const loadScenario = (scenarioId: string) => {
    const scenario = savedScenarios.find((candidate) => candidate.id === scenarioId);
    if (!scenario) return;
    const input = scenario.input;
    const card = emptyCard();
    card.skuId = scenario.skuId ?? "";
    card.price = String(input.purchasePrice);
    card.currency = input.currency;
    card.packQuantity = String(input.packQuantity);
    card.packUnit = input.packUnit;
    card.yieldPerUnit = String(input.yieldPerUnit);
    card.taxIncluded = input.taxIncluded;
    if (input.freight !== undefined) card.freight = String(input.freight);
    if (input.importDutyRate !== undefined) card.importDutyRatePct = String(input.importDutyRate * 100);
    if (input.vatRate !== undefined) card.vatRatePct = String(input.vatRate * 100);
    if (input.coldChain !== undefined) card.coldChain = String(input.coldChain);
    if (input.storage !== undefined) card.storage = String(input.storage);
    if (input.preparationMaterials !== undefined) card.preparationMaterials = String(input.preparationMaterials);
    if (input.water !== undefined) card.water = String(input.water);
    if (input.laborMinutesPerTest !== undefined) card.laborMinutes = String(input.laborMinutesPerTest);
    if (input.laborRatePerHour !== undefined) card.laborRate = String(input.laborRatePerHour);
    if (input.equipmentAllocationPerTest !== undefined) card.equipmentAllocation = String(input.equipmentAllocationPerTest);
    if (input.qcGptPerTest !== undefined) card.qcGpt = String(input.qcGptPerTest);
    if (input.sterilizationPerTest !== undefined) card.sterilization = String(input.sterilizationPerTest);
    if (input.wasteRate !== undefined) card.wasteRatePct = String(input.wasteRate * 100);
    if (input.failureRepeatRate !== undefined) card.failureRepeatRatePct = String(input.failureRepeatRate * 100);
    if (input.disposalPerTest !== undefined) card.disposal = String(input.disposalPerTest);
    if (input.validationCostAmortized !== undefined) card.validation = String(input.validationCostAmortized);
    if (input.serviceCostPerTest !== undefined) card.service = String(input.serviceCostPerTest);
    setName(scenario.name);
    setCards([card]);
    setCalculated(null);
  };

  const currencies = useMemo(
    () => [...new Set(cards.map((card) => card.currency.trim().toUpperCase()).filter(Boolean))],
    [cards],
  );
  const fxRequired = currencies.length > 1;

  /** Build + validate the engine input for one card; returns an error string or the input. */
  const buildInput = (card: CardState): { input?: CostPerTestInput; error?: string } => {
    const skuName = optionById.get(card.skuId)?.name ?? card.skuId;
    const fail = (message: string) => ({ error: `${skuName}: ${message}` });

    const price = parseNumber(card.price);
    if (price === undefined || Number.isNaN(price) || price < 0) return fail("purchase price must be a non-negative number.");
    const packQuantity = parseNumber(card.packQuantity);
    if (packQuantity === undefined || Number.isNaN(packQuantity) || packQuantity <= 0)
      return fail("pack quantity must be positive.");
    if (!card.packUnit.trim()) return fail("pack unit is required.");
    const yieldPerUnit = parseNumber(card.yieldPerUnit);
    if (yieldPerUnit === undefined || Number.isNaN(yieldPerUnit) || yieldPerUnit <= 0)
      return fail("yield (tests per unit) must be positive.");
    const currency = card.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) return fail("currency must be a 3-letter ISO code.");

    const input: CostPerTestInput = {
      purchasePrice: price,
      currency,
      packQuantity,
      packUnit: card.packUnit.trim(),
      yieldPerUnit,
      taxIncluded: card.taxIncluded,
    };

    const mutable = input as unknown as Record<string, unknown>;
    for (const field of MONEY_FIELDS) {
      const value = parseNumber(card[field.key]);
      if (value === undefined) continue;
      if (Number.isNaN(value) || value < 0) return fail(`${field.label} must be a non-negative number.`);
      mutable[field.input] = value;
    }
    for (const field of RATE_FIELDS) {
      const value = parseNumber(card[field.key]);
      if (value === undefined) continue;
      if (Number.isNaN(value) || value < 0 || value > 100)
        return fail(`${field.label} must be between 0 and 100.`);
      mutable[field.input] = value / 100;
    }

    const laborMinutes = parseNumber(card.laborMinutes);
    const laborRate = parseNumber(card.laborRate);
    if ((laborMinutes === undefined) !== (laborRate === undefined))
      return fail("labor minutes and labor rate must be provided together.");
    if (laborMinutes !== undefined && laborRate !== undefined) {
      if (Number.isNaN(laborMinutes) || Number.isNaN(laborRate) || laborMinutes < 0 || laborRate < 0)
        return fail("labor values must be non-negative numbers.");
      input.laborMinutesPerTest = laborMinutes;
      input.laborRatePerHour = laborRate;
    }

    if (fxRequired && currency !== fx.to.trim().toUpperCase()) {
      // This card needs conversion through the snapshot.
      if (!fx.from || !fx.to || !fx.rate || !fx.rateDate || !fx.source.trim()) {
        return fail("currencies differ — complete the exchange-rate snapshot (from, to, rate, date, source).");
      }
      if (currency !== fx.from.trim().toUpperCase()) {
        return fail(
          `currency ${currency} is neither the snapshot target (${fx.to.toUpperCase()}) nor its source (${fx.from.toUpperCase()}) — one snapshot covers one currency pair.`,
        );
      }
      const rate = Number(fx.rate);
      if (!Number.isFinite(rate) || rate <= 0) return fail("exchange rate must be positive.");
      input.exchangeRate = {
        fromCurrency: fx.from.trim().toUpperCase(),
        toCurrency: fx.to.trim().toUpperCase(),
        rate,
        rateDate: fx.rateDate,
        source: fx.source.trim(),
      };
    }
    return { input };
  };

  const calculate = () => {
    const newErrors: string[] = [];
    if (cards.length === 0) {
      setErrors(["Add at least one SKU scenario."]);
      setCalculated(null);
      return;
    }
    if (cards.some((card) => !card.skuId)) {
      setErrors(["Every scenario card needs a SKU selection."]);
      setCalculated(null);
      return;
    }
    if (fxRequired && (!fx.from || !fx.to || !fx.rate || !fx.rateDate || !fx.source.trim())) {
      newErrors.push(
        `Currencies differ (${currencies.join(", ")}) — the exchange-rate snapshot is required before calculating.`,
      );
    }
    if (fxRequired && fx.from.trim().toUpperCase() === fx.to.trim().toUpperCase()) {
      newErrors.push("Exchange-rate snapshot: from and to currencies must differ.");
    }
    const results: CalculatedScenario[] = cards.map((card) => {
      const skuName = optionById.get(card.skuId)?.name ?? card.skuId;
      const built = buildInput(card);
      if (built.error) {
        return { key: card.key, skuId: card.skuId, skuName, priceObservationId: card.priceObservationId, input: null, result: null, error: built.error };
      }
      try {
        return {
          key: card.key,
          skuId: card.skuId,
          skuName,
          priceObservationId: card.priceObservationId,
          input: built.input!,
          result: calculateCostPerTest(built.input!),
          error: null,
        };
      } catch (error) {
        return {
          key: card.key,
          skuId: card.skuId,
          skuName,
          priceObservationId: card.priceObservationId,
          input: built.input!,
          result: null,
          error: `${skuName}: ${error instanceof Error ? error.message : "calculation failed"}`,
        };
      }
    });
    for (const result of results) if (result.error) newErrors.push(result.error);
    setErrors(newErrors);
    setCalculated(results);
    setSensitivity(null);
  };

  const successful = (calculated ?? []).filter(
    (entry): entry is CalculatedScenario & { result: CostPerTestResult; input: CostPerTestInput } =>
      entry.result !== null && entry.input !== null,
  );
  const resultCurrencies = [...new Set(successful.map((entry) => entry.result.currency))];
  const comparable = successful.length > 0 && resultCurrencies.length === 1;

  const sensitivityResult = useMemo(() => {
    if (!sensitivity || !calculated) return null;
    const entry = calculated.find((candidate) => candidate.key === sensitivity.cardKey);
    if (!entry?.input || !entry.result) return null;
    const base = entry.input[sensitivity.parameter];
    if (base === undefined || base === 0) return { zero: true as const, entry };
    const baseValue = base as number;
    const deltas = [-0.2, -0.1, -0.05, 0.05, 0.1, 0.2].map((fraction) => ({
      fraction,
      delta: baseValue * fraction,
    }));
    return {
      zero: false as const,
      entry,
      deltas,
      run: runSensitivity(entry.input, sensitivity.parameter, deltas.map((d) => d.delta)),
    };
  }, [sensitivity, calculated]);

  const handleSave = () => {
    setMessage(null);
    const scenarios: Array<{ skuId: string; priceObservationId?: string; input: CostPerTestInput }> = [];
    const buildErrors: string[] = [];
    for (const card of cards) {
      const built = buildInput(card);
      if (built.error) buildErrors.push(built.error);
      else if (built.input) {
        scenarios.push({
          skuId: card.skuId,
          ...(card.priceObservationId ? { priceObservationId: card.priceObservationId } : {}),
          input: built.input,
        });
      }
    }
    if (!name.trim()) buildErrors.push("Scenario name is required.");
    if (scenarios.length === 0) buildErrors.push("Add at least one valid SKU scenario.");
    if (buildErrors.length > 0) {
      setMessage({ kind: "error", text: buildErrors.join(" ") });
      return;
    }
    startTransition(async () => {
      const result = await saveScenario({
        name: name.trim(),
        ...(projectId ? { projectId } : {}),
        scenarios,
      });
      if (result.ok) {
        setMessage({
          kind: "success",
          text: `Saved ${result.count} scenario${result.count === 1 ? "" : "s"}${projectId ? " and linked them to the research project" : ""}.`,
        });
      } else {
        setMessage({ kind: "error", text: result.error });
      }
    });
  };

  const exportCsv = () => {
    interface Row {
      sku: string;
      rowType: string;
      component: string;
      label: string;
      amount: number | string;
      currency: string;
      sourceField: string;
    }
    const rows: Row[] = successful.flatMap((entry) => [
      {
        sku: entry.skuName,
        rowType: "summary",
        component: "effective_cost_per_test",
        label: "Effective cost per test",
        amount: entry.result.effectiveCostPerTest,
        currency: entry.result.currency,
        sourceField: "all",
      },
      {
        sku: entry.skuName,
        rowType: "summary",
        component: "usable_tests",
        label: "Usable tests per pack",
        amount: entry.result.usableTests,
        currency: "",
        sourceField: "packQuantity×yieldPerUnit",
      },
      ...entry.result.breakdown.map((item) => ({
        sku: entry.skuName,
        rowType: "breakdown",
        component: item.key,
        label: `${item.label}${item.perTest ? " (per-test × usable tests)" : " (per pack)"}`,
        amount: item.amount,
        currency: entry.result.currency,
        sourceField: item.sourceField,
      })),
    ]);
    downloadText(
      `cost-per-test-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(rows, [
        { key: "sku", header: "SKU", value: (row) => row.sku },
        { key: "rowType", header: "Row", value: (row) => row.rowType },
        { key: "component", header: "Component", value: (row) => row.component },
        { key: "label", header: "Label", value: (row) => row.label },
        { key: "amount", header: "Amount", value: (row) => row.amount },
        { key: "currency", header: "Currency", value: (row) => row.currency },
        { key: "sourceField", header: "Source field(s)", value: (row) => row.sourceField },
      ]),
      "text/csv",
    );
  };

  const exportJson = () => {
    downloadText(
      `cost-per-test-${new Date().toISOString().slice(0, 10)}.json`,
      toJsonExport({
        name: name || "cost-per-test comparison",
        exportedAt: new Date().toISOString(),
        exchangeRateSnapshot: fxRequired ? fx : null,
        scenarios: successful.map((entry) => ({
          skuId: entry.skuId,
          skuName: entry.skuName,
          input: entry.input,
          result: entry.result,
        })),
      }),
      "application/json",
    );
  };

  return (
    <div className="space-y-4">
      {/* Scenario setup */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Scenario setup</CardTitle>
          <CardDescription className="text-xs">
            Add two or more SKUs to compare their fully attributable cost per test. Prices and pack
            sizes prefill from the latest observations and stay editable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="scenario-name" className="mb-1 block text-xs">
                Scenario name
              </Label>
              <Input
                id="scenario-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. TSA dehydrated vs ready plates"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Combobox
                label="Add SKU"
                options={skuOptions.map((option) => ({
                  value: option.id,
                  label: option.name,
                  hint: option.catalogueNumber ?? undefined,
                }))}
                value={pickerValue}
                onChange={(value) => {
                  addCard(value);
                  setPickerValue(null);
                }}
                placeholder="Search SKUs…"
                clearable={false}
              />
              <div>
                <Label htmlFor="load-scenario" className="mb-1 block text-xs">
                  Load saved scenario
                </Label>
                <select
                  id="load-scenario"
                  value=""
                  onChange={(event) => {
                    if (event.target.value) loadScenario(event.target.value);
                  }}
                  className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="">Select…</option>
                  {savedScenarios.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-SKU input cards */}
      {cards.map((card, index) => {
        const option = optionById.get(card.skuId);
        return (
          <Card key={card.key}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">
                  SKU {index + 1}: {option?.name ?? "select a SKU"}
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCard(card.key)}
                  aria-label={`Remove scenario ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </Button>
              </div>
              {option?.normalizedPackLabel ? (
                <CardDescription className="text-xs">
                  Pack: {option.packDescription ?? option.normalizedPackLabel} — prefilled
                  normalized content {option.normalizedPackLabel}
                  {option.latestPrice
                    ? ` · latest price ${formatMoney(option.latestPrice.amount, option.latestPrice.currency)} (${option.latestPrice.date})`
                    : " · no price observed"}
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label className="mb-1 block text-xs" htmlFor={`price-${card.key}`}>
                    Purchase price / pack
                  </Label>
                  <Input
                    id={`price-${card.key}`}
                    type="number"
                    min={0}
                    value={card.price}
                    onChange={(event) => updateCard(card.key, { price: event.target.value })}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs" htmlFor={`currency-${card.key}`}>
                    Currency
                  </Label>
                  <Input
                    id={`currency-${card.key}`}
                    value={card.currency}
                    maxLength={3}
                    onChange={(event) =>
                      updateCard(card.key, { currency: event.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs" htmlFor={`packq-${card.key}`}>
                    Pack quantity
                  </Label>
                  <Input
                    id={`packq-${card.key}`}
                    type="number"
                    min={0}
                    value={card.packQuantity}
                    onChange={(event) => updateCard(card.key, { packQuantity: event.target.value })}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs" htmlFor={`packu-${card.key}`}>
                    Pack unit
                  </Label>
                  <Input
                    id={`packu-${card.key}`}
                    value={card.packUnit}
                    onChange={(event) => updateCard(card.key, { packUnit: event.target.value })}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs" htmlFor={`yield-${card.key}`}>
                    Yield (tests / unit)
                  </Label>
                  <Input
                    id={`yield-${card.key}`}
                    type="number"
                    min={0}
                    step="any"
                    value={card.yieldPerUnit}
                    onChange={(event) => updateCard(card.key, { yieldPerUnit: event.target.value })}
                    placeholder="e.g. 1.25"
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <input
                    id={`taxinc-${card.key}`}
                    type="checkbox"
                    checked={card.taxIncluded}
                    onChange={(event) => updateCard(card.key, { taxIncluded: event.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  />
                  <Label htmlFor={`taxinc-${card.key}`} className="text-xs font-normal">
                    Price includes VAT
                  </Label>
                </div>
                <div>
                  <Label className="mb-1 block text-xs" htmlFor={`laborm-${card.key}`}>
                    Labor minutes / test
                  </Label>
                  <Input
                    id={`laborm-${card.key}`}
                    type="number"
                    min={0}
                    value={card.laborMinutes}
                    onChange={(event) => updateCard(card.key, { laborMinutes: event.target.value })}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs" htmlFor={`laborr-${card.key}`}>
                    Labor rate / hour
                  </Label>
                  <Input
                    id={`laborr-${card.key}`}
                    type="number"
                    min={0}
                    value={card.laborRate}
                    onChange={(event) => updateCard(card.key, { laborRate: event.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {RATE_FIELDS.map((field) => (
                  <div key={field.key}>
                    <Label className="mb-1 block text-xs" htmlFor={`${field.key}-${card.key}`}>
                      {field.label}
                    </Label>
                    <Input
                      id={`${field.key}-${card.key}`}
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={card[field.key]}
                      onChange={(event) =>
                        updateCard(card.key, { [field.key]: event.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>

              <details className="rounded-md border border-slate-200">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700">
                  Cost components (optional, in scenario currency)
                </summary>
                <div className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-2 lg:grid-cols-4">
                  {MONEY_FIELDS.map((field) => (
                    <div key={field.key}>
                      <Label className="mb-1 block text-xs" htmlFor={`${field.key}-${card.key}`}>
                        {field.label}
                      </Label>
                      <Input
                        id={`${field.key}-${card.key}`}
                        type="number"
                        min={0}
                        step="any"
                        value={card[field.key]}
                        onChange={(event) =>
                          updateCard(card.key, { [field.key]: event.target.value })
                        }
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </details>
            </CardContent>
          </Card>
        );
      })}

      {/* Exchange-rate snapshot */}
      {fxRequired ? (
        <Card className="border-amber-300">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Exchange-rate snapshot (required)</CardTitle>
            <CardDescription className="text-xs">
              Currencies differ ({currencies.join(", ")}). One explicit snapshot converts every
              non-target currency — rate, date and source are mandatory; there is no silent
              conversion.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label className="mb-1 block text-xs" htmlFor="fx-from">
                From currency
              </Label>
              <select
                id="fx-from"
                value={fx.from}
                onChange={(event) => setFx((current) => ({ ...current, from: event.target.value }))}
                className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="">Select…</option>
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs" htmlFor="fx-to">
                To currency (comparison base)
              </Label>
              <select
                id="fx-to"
                value={fx.to}
                onChange={(event) => setFx((current) => ({ ...current, to: event.target.value }))}
                className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="">Select…</option>
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs" htmlFor="fx-rate">
                Rate (× from → to)
              </Label>
              <Input
                id="fx-rate"
                type="number"
                min={0}
                step="any"
                value={fx.rate}
                onChange={(event) => setFx((current) => ({ ...current, rate: event.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs" htmlFor="fx-date">
                Rate date
              </Label>
              <Input
                id="fx-date"
                type="date"
                value={fx.rateDate}
                onChange={(event) => setFx((current) => ({ ...current, rateDate: event.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs" htmlFor="fx-source">
                Rate source
              </Label>
              <Input
                id="fx-source"
                value={fx.source}
                placeholder="e.g. SBV daily rate"
                onChange={(event) => setFx((current) => ({ ...current, source: event.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={calculate} disabled={cards.length === 0}>
          <Calculator className="h-4 w-4" aria-hidden="true" />
          Calculate
        </Button>
        {cards.length < 2 && cards.length > 0 ? (
          <p className="text-xs text-slate-500">Add at least two SKUs to compare scenarios.</p>
        ) : null}
      </div>

      {errors.length > 0 ? (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-800">Cannot compute every scenario:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-red-700">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Results */}
      {calculated && successful.length > 0 ? (
        <section aria-label="Results" className="space-y-4">
          {comparable ? (
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">
                  Effective cost per test ({resultCurrencies[0]})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <CostBarChart
                  currency={resultCurrencies[0]}
                  data={successful.map((entry) => ({
                    name: entry.skuName.length > 22 ? `${entry.skuName.slice(0, 22)}…` : entry.skuName,
                    cost: entry.result.effectiveCostPerTest,
                  }))}
                />
              </CardContent>
            </Card>
          ) : null}

          {successful.map((entry) => (
            <Card key={entry.key}>
              <CardHeader className="p-4 pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm">{entry.skuName}</CardTitle>
                  <p className="text-lg font-semibold tabular-nums text-navy-900">
                    {formatMoney(entry.result.effectiveCostPerTest, entry.result.currency)}
                    <span className="ml-1 text-xs font-normal text-slate-500">/ test</span>
                  </p>
                </div>
                <CardDescription className="text-xs">
                  {formatNumber(entry.result.usableTests, 2)} usable tests per pack · total
                  attributable {formatMoney(entry.result.totalAttributableCost, entry.result.currency)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <div className="overflow-auto rounded-md border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-3 py-2">Component</th>
                        <th scope="col" className="px-3 py-2">Scope</th>
                        <th scope="col" className="px-3 py-2 text-right">Amount ({entry.result.currency})</th>
                        <th scope="col" className="px-3 py-2">Source field</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.result.breakdown.map((item) => (
                        <tr key={item.key} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 text-slate-700">{item.label}</td>
                          <td className="px-3 py-1.5 text-slate-500">
                            {item.perTest ? "per test × usable tests" : "per pack"}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-slate-800">
                            {formatNumber(item.amount, 4)}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-[10px] text-slate-500">
                            {item.sourceField}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Assumptions (always visible)
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-600">
                    {entry.result.assumptions.map((assumption) => (
                      <li key={assumption}>{assumption}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Sensitivity */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Sensitivity analysis</CardTitle>
              <CardDescription className="text-xs">
                One-at-a-time perturbation of a parameter by ±5 / 10 / 20% of its base value.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1 block text-xs" htmlFor="sens-card">
                    Scenario
                  </Label>
                  <select
                    id="sens-card"
                    value={sensitivity?.cardKey ?? ""}
                    onChange={(event) =>
                      setSensitivity((current) => ({
                        cardKey: event.target.value,
                        parameter: current?.parameter ?? "purchasePrice",
                      }))
                    }
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <option value="">Select scenario…</option>
                    {successful.map((entry) => (
                      <option key={entry.key} value={entry.key}>
                        {entry.skuName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block text-xs" htmlFor="sens-param">
                    Parameter
                  </Label>
                  <select
                    id="sens-param"
                    value={sensitivity?.parameter ?? "purchasePrice"}
                    onChange={(event) =>
                      setSensitivity((current) =>
                        current
                          ? { ...current, parameter: event.target.value as SensitivityParameter }
                          : current,
                      )
                    }
                    disabled={!sensitivity}
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                  >
                    {SENSITIVITY_PARAMETERS.map((parameter) => (
                      <option key={parameter} value={parameter}>
                        {parameter}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {sensitivityResult && !sensitivityResult.zero ? (
                <div className="overflow-auto rounded-md border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-3 py-2">Change</th>
                        <th scope="col" className="px-3 py-2 text-right">Delta</th>
                        <th scope="col" className="px-3 py-2 text-right">Cost / test</th>
                        <th scope="col" className="px-3 py-2 text-right">vs base</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sensitivityResult.run.rows.map((row, index) => {
                        const pct = sensitivityResult.deltas[index].fraction * 100;
                        const deltaVsBase = row.effectiveCostPerTest - sensitivityResult.run.baseEffectiveCostPerTest;
                        return (
                          <tr key={pct} className="border-t border-slate-100">
                            <td className="px-3 py-1.5 tabular-nums text-slate-700">
                              {pct > 0 ? `+${pct}%` : `${pct}%`}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">
                              {formatNumber(row.delta, 4)}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-slate-800">
                              {formatMoney(row.effectiveCostPerTest, sensitivityResult.run.currency)}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-1.5 text-right tabular-nums",
                                deltaVsBase > 0 ? "text-red-600" : "text-teal-700",
                              )}
                            >
                              {deltaVsBase > 0 ? "+" : ""}
                              {formatNumber(deltaVsBase, 4)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {sensitivityResult?.zero ? (
                <p className="text-xs text-slate-500">
                  Parameter has no base value in this scenario — enter one on the card to analyze
                  it.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Save + export */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Save &amp; export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="save-project" className="mb-1 block text-xs">
                    Research project (optional)
                  </Label>
                  <select
                    id="save-project"
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <option value="">Do not link to a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={handleSave} disabled={pending}>
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  {pending ? "Saving…" : "Save scenario"}
                </Button>
                <Button type="button" variant="outline" onClick={exportCsv}>
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Export CSV
                </Button>
                <Button type="button" variant="outline" onClick={exportJson}>
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Export JSON
                </Button>
              </div>
              {message ? (
                <p
                  role={message.kind === "error" ? "alert" : "status"}
                  className={cn(
                    "rounded-md border p-3 text-xs",
                    message.kind === "error"
                      ? "border-red-300 bg-red-50 text-red-800"
                      : "border-teal-300 bg-teal-50 text-teal-800",
                  )}
                >
                  {message.text}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RecordPriceInput } from "@/app/(intelligence)/prices/actions";

export interface PriceDialogOption {
  id: string;
  label: string;
}

export interface PackOption {
  id: string;
  skuId: string;
  label: string;
}

type RecordPriceAction = (
  input: RecordPriceInput,
) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/**
 * "Record price" dialog. Submits to the recordPrice server action; the
 * action validates with the shared zod schema and computes normalized
 * per-unit / per-test fields (pack-based, FX snapshot all-or-none).
 */
export function RecordPriceDialog({
  skus,
  packs,
  suppliers,
  sources,
  recordPrice,
}: {
  skus: PriceDialogOption[];
  packs: PackOption[];
  suppliers: PriceDialogOption[];
  sources: PriceDialogOption[];
  recordPrice: RecordPriceAction;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [skuId, setSkuId] = useState("");
  const [packId, setPackId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [date, setDate] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [geography, setGeography] = useState("VN");
  const [incoterm, setIncoterm] = useState("");
  const [taxIncluded, setTaxIncluded] = useState(false);
  const [vatRatePct, setVatRatePct] = useState("");
  const [yieldPerUnit, setYieldPerUnit] = useState("");
  const [confidence, setConfidence] = useState("0.7");
  const [visibility, setVisibility] = useState<"canonical" | "tenant_private">("tenant_private");
  const [fxTarget, setFxTarget] = useState("");
  const [fxRate, setFxRate] = useState("");
  const [fxDate, setFxDate] = useState("");
  const [fxSource, setFxSource] = useState("");

  const skuPacks = packs.filter((pack) => pack.skuId === skuId);
  const optionalNumber = (value: string) => (value.trim() === "" ? undefined : Number(value));

  const submit = () => {
    setError(null);
    const payload: RecordPriceInput = {
      skuId,
      ...(packId ? { packConfigurationId: packId } : {}),
      ...(supplierId ? { supplierOrgId: supplierId } : {}),
      amount: Number(amount),
      currency: currency.trim().toUpperCase(),
      observationDate: date,
      taxIncluded,
      ...(vatRatePct.trim() !== "" ? { vatRatePct: Number(vatRatePct) } : {}),
      ...(incoterm.trim() ? { incoterm: incoterm.trim().toUpperCase() } : {}),
      geography: geography.trim().toUpperCase(),
      quantity: Number(quantity),
      sourceId,
      confidence: Number(confidence),
      visibility,
      ...(optionalNumber(yieldPerUnit) !== undefined ? { yieldPerUnit: optionalNumber(yieldPerUnit) } : {}),
      ...(fxTarget.trim() ? { fxTargetCurrency: fxTarget.trim().toUpperCase() } : {}),
      ...(optionalNumber(fxRate) !== undefined ? { fxRate: optionalNumber(fxRate) } : {}),
      ...(fxDate ? { fxRateDate: fxDate } : {}),
      ...(fxSource.trim() ? { fxSource: fxSource.trim() } : {}),
    };
    startTransition(async () => {
      const result = await recordPrice(payload);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Record price
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record a price observation</DialogTitle>
            <DialogDescription>
              Observations are immutable once recorded and enter the graph as source-captured
              evidence. Normalized values are computed when a pack (and FX snapshot, if converting)
              is provided.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[55vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            <div>
              <Label htmlFor="rp-sku" className="mb-1 block text-xs">SKU *</Label>
              <select
                id="rp-sku"
                value={skuId}
                onChange={(event) => {
                  setSkuId(event.target.value);
                  setPackId("");
                }}
                className={selectClass}
              >
                <option value="">Select…</option>
                {skus.map((sku) => (
                  <option key={sku.id} value={sku.id}>{sku.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="rp-pack" className="mb-1 block text-xs">Pack configuration</Label>
              <select
                id="rp-pack"
                value={packId}
                onChange={(event) => setPackId(event.target.value)}
                disabled={!skuId}
                className={selectClass}
              >
                <option value="">{skuId ? "Select…" : "Select a SKU first"}</option>
                {skuPacks.map((pack) => (
                  <option key={pack.id} value={pack.id}>{pack.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="rp-amount" className="mb-1 block text-xs">Amount *</Label>
              <Input id="rp-amount" type="number" min={0} step="any" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="rp-currency" className="mb-1 block text-xs">Currency *</Label>
              <Input id="rp-currency" maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
            </div>
            <div>
              <Label htmlFor="rp-date" className="mb-1 block text-xs">Observation date *</Label>
              <Input id="rp-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="rp-quantity" className="mb-1 block text-xs">Quantity (packs) *</Label>
              <Input id="rp-quantity" type="number" min={0} step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="rp-geo" className="mb-1 block text-xs">Geography *</Label>
              <Input id="rp-geo" maxLength={6} value={geography} onChange={(event) => setGeography(event.target.value.toUpperCase())} />
            </div>
            <div>
              <Label htmlFor="rp-incoterm" className="mb-1 block text-xs">Incoterm</Label>
              <Input id="rp-incoterm" placeholder="EXW / DAP / CIF…" value={incoterm} onChange={(event) => setIncoterm(event.target.value)} />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input
                id="rp-tax"
                type="checkbox"
                checked={taxIncluded}
                onChange={(event) => setTaxIncluded(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              <Label htmlFor="rp-tax" className="text-xs font-normal">Amount includes VAT</Label>
            </div>
            <div>
              <Label htmlFor="rp-vat" className="mb-1 block text-xs">VAT rate %</Label>
              <Input id="rp-vat" type="number" min={0} max={100} step="any" value={vatRatePct} onChange={(event) => setVatRatePct(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="rp-supplier" className="mb-1 block text-xs">Supplier</Label>
              <select id="rp-supplier" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className={selectClass}>
                <option value="">Not recorded</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="rp-source" className="mb-1 block text-xs">Evidence source *</Label>
              <select id="rp-source" value={sourceId} onChange={(event) => setSourceId(event.target.value)} className={selectClass}>
                <option value="">Select…</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>{source.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="rp-yield" className="mb-1 block text-xs">Yield (tests / unit, for per-test)</Label>
              <Input id="rp-yield" type="number" min={0} step="any" value={yieldPerUnit} onChange={(event) => setYieldPerUnit(event.target.value)} placeholder="optional" />
            </div>
            <div>
              <Label htmlFor="rp-confidence" className="mb-1 block text-xs">Confidence 0–1</Label>
              <Input id="rp-confidence" type="number" min={0} max={1} step={0.05} value={confidence} onChange={(event) => setConfidence(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="rp-visibility" className="mb-1 block text-xs">Visibility</Label>
              <select
                id="rp-visibility"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as "canonical" | "tenant_private")}
                className={selectClass}
              >
                <option value="tenant_private">Tenant private (quoted price)</option>
                <option value="canonical">Canonical (public list price)</option>
              </select>
            </div>
          </div>

          <fieldset className="rounded-md border border-slate-200 p-3">
            <legend className="px-1 text-xs font-semibold text-slate-700">
              Currency conversion (optional, all-or-none)
            </legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="rp-fx-target" className="mb-1 block text-xs">Target currency</Label>
                <Input id="rp-fx-target" maxLength={3} value={fxTarget} onChange={(event) => setFxTarget(event.target.value.toUpperCase())} />
              </div>
              <div>
                <Label htmlFor="rp-fx-rate" className="mb-1 block text-xs">Rate</Label>
                <Input id="rp-fx-rate" type="number" min={0} step="any" value={fxRate} onChange={(event) => setFxRate(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="rp-fx-date" className="mb-1 block text-xs">Rate date</Label>
                <Input id="rp-fx-date" type="date" value={fxDate} onChange={(event) => setFxDate(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="rp-fx-source" className="mb-1 block text-xs">Rate source</Label>
                <Input id="rp-fx-source" value={fxSource} onChange={(event) => setFxSource(event.target.value)} placeholder="e.g. SBV" />
              </div>
            </div>
          </fieldset>

          {error ? (
            <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              onClick={submit}
              disabled={pending || !skuId || !amount || !date || !sourceId || !geography}
            >
              {pending ? "Recording…" : "Record observation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

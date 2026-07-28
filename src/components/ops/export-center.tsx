"use client";

import { useState } from "react";
import { Download, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Export center (client): pick a family + format, optionally include
 * tenant-private rows (demo-owner authorization note), download via the
 * /api/exports/[family] route handlers. Every export is audited server-side.
 */

const FAMILIES = [
  { value: "organizations", label: "Organizations" },
  { value: "products", label: "Products" },
  { value: "skus", label: "SKUs" },
  { value: "prices", label: "Prices" },
  { value: "tenders", label: "Tenders" },
  { value: "installed-assets", label: "Installed assets" },
  { value: "sources", label: "Sources" },
  { value: "signals", label: "Signals" },
  { value: "research-findings", label: "Research findings" },
] as const;

const FORMATS = [
  { value: "csv", label: "CSV", note: "RFC-4180, opens in Excel" },
  { value: "json", label: "JSON", note: "Pretty-printed, with scope metadata" },
  { value: "xlsx", label: "XLSX", note: "Single-sheet workbook" },
] as const;

/** Tenant-private families — the checkbox matters most for these. */
const TENANT_PRIVATE_HEAVY = new Set(["prices", "installed-assets", "signals", "research-findings"]);

export function ExportCenter({ demoTenantId }: { demoTenantId: string }) {
  const [family, setFamily] = useState<string>("organizations");
  const [format, setFormat] = useState<string>("csv");
  const [includeTenantPrivate, setIncludeTenantPrivate] = useState(false);

  const href = `/api/exports/${family}?format=${format}${
    includeTenantPrivate ? `&includeTenantPrivate=true&tenant=${demoTenantId}` : ""
  }`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New export</CardTitle>
        <CardDescription>
          Canonical reference data is always included. Tenant-private rows are
          only exported when explicitly authorized below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="export-family">Entity family</Label>
            <Select value={family} onValueChange={setFamily}>
              <SelectTrigger id="export-family">
                <SelectValue placeholder="Choose a family" />
              </SelectTrigger>
              <SelectContent>
                {FAMILIES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="export-format">Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="export-format">
                <SelectValue placeholder="Choose a format" />
              </SelectTrigger>
              <SelectContent>
                {FORMATS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} — {option.note}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <label className="flex items-start gap-2.5 text-sm text-amber-900">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-amber-400 accent-amber-700"
              checked={includeTenantPrivate}
              onChange={(event) => setIncludeTenantPrivate(event.target.checked)}
            />
            <span>
              <span className="font-medium">Include tenant-private rows</span>{" "}
              — I am authorized (demo workspace owner) to export tenant-private
              intelligence
              {TENANT_PRIVATE_HEAVY.has(family)
                ? " (this family is mostly tenant-private; without this box the export may be empty)"
                : ""}
              . The export is recorded in the audit log.
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <a href={href} download>
              <Download className="h-4 w-4" aria-hidden="true" />
              Download {family} ({format})
            </a>
          </Button>
          <Badge variant={includeTenantPrivate ? "warning" : "success"}>
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            {includeTenantPrivate ? "canonical + tenant-private" : "canonical only"}
          </Badge>
        </div>

        <p className="text-xs text-slate-500">
          Served by <code className="font-mono">GET /api/exports/{family}?format={format}</code>.
          Visibility guard runs server-side: without the tenant assertion the
          route silently drops tenant-private rows even if requested.
        </p>
      </CardContent>
    </Card>
  );
}

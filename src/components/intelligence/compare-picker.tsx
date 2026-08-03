"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Combobox, type ComboboxOption } from "@/components/products/combobox";

/**
 * SKU multi-picker for the compare page: keeps the selection in the URL
 * (?skus=a,b,c) so comparisons are shareable. Max 4 SKUs; first is the
 * reference.
 */
export function ComparePicker({
  options,
  selectedIds,
}: {
  options: ComboboxOption[];
  selectedIds: string[];
}) {
  const router = useRouter();

  const navigate = (ids: string[]) => {
    router.replace(ids.length > 0 ? `/compare?skus=${ids.join(",")}` : "/compare");
  };

  const add = (id: string | null) => {
    if (!id || selectedIds.includes(id) || selectedIds.length >= 4) return;
    navigate([...selectedIds, id]);
  };

  const remove = (id: string) => {
    navigate(selectedIds.filter((selected) => selected !== id));
  };

  const selectedOptions = selectedIds
    .map((id) => options.find((option) => option.value === id))
    .filter((option): option is ComboboxOption => Boolean(option));

  return (
    <div className="space-y-2">
      <div className="max-w-xl">
        <Combobox
          label={`Add SKU (${selectedIds.length}/4 selected — first is the reference)`}
          options={options}
          value={null}
          onChange={add}
          placeholder="Search SKUs to add…"
          clearable={false}
          disabled={selectedIds.length >= 4}
        />
      </div>
      {selectedOptions.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Selected SKUs">
          {selectedOptions.map((option, index) => (
            <li
              key={option.value}
              className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white py-1 pl-3 pr-1 text-xs text-slate-700"
            >
              <span className="font-medium">
                {index === 0 ? "Reference · " : ""}
                {option.label}
              </span>
              <button
                type="button"
                aria-label={`Remove ${option.label}`}
                onClick={() => remove(option.value)}
                className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

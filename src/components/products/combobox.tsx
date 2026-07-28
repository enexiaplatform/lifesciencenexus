"use client";

import { useId, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Secondary text shown under the label and included in filtering. */
  hint?: string;
}

/**
 * Accessible searchable select (combobox pattern): a text input filters the
 * option list; ArrowUp/ArrowDown move the active option, Enter selects,
 * Escape closes. Selection is controlled via `value`/`onChange`.
 */
export function Combobox({
  label,
  options,
  value,
  onChange,
  placeholder = "Type to search…",
  emptyText = "No matches",
  disabled,
  clearable = true,
  id,
}: {
  label: string;
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  clearable?: boolean;
  id?: string;
}) {
  const reactId = useId();
  const inputId = id ?? `cb-${reactId}`;
  const listboxId = `cb-list-${reactId}`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? options.filter((option) =>
        `${option.label} ${option.hint ?? ""}`.toLowerCase().includes(normalized),
      )
    : options;

  const choose = (option: ComboboxOption) => {
    onChange(option.value);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div
        className="relative"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setOpen(false);
            setQuery("");
          }
        }}
      >
        <div className="relative">
          <input
            ref={inputRef}
            id={inputId}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={
              open && filtered[activeIndex] ? `${listboxId}-${activeIndex}` : undefined
            }
            aria-autocomplete="list"
            disabled={disabled}
            value={open ? query : (selected?.label ?? "")}
            placeholder={selected ? selected.label : placeholder}
            onFocus={() => {
              setOpen(true);
              setQuery("");
              setActiveIndex(0);
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
                setActiveIndex((index) => Math.min(filtered.length - 1, index + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(0, index - 1));
              } else if (event.key === "Enter") {
                if (open && filtered[activeIndex]) {
                  event.preventDefault();
                  choose(filtered[activeIndex]);
                }
              } else if (event.key === "Escape") {
                setOpen(false);
                setQuery("");
              }
            }}
            className={cn(
              "flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 pr-16 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
              !open && selected ? "font-medium" : "",
            )}
          />
          <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
            {clearable && selected && !disabled ? (
              <button
                type="button"
                aria-label={`Clear ${label}`}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onClick={() => {
                  onChange(null);
                  inputRef.current?.focus();
                }}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
            <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
        </div>
        {open ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-md"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">{emptyText}</li>
            ) : (
              filtered.map((option, index) => (
                <li
                  key={option.value}
                  id={`${listboxId}-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(option);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex cursor-default items-start justify-between gap-2 px-3 py-1.5 text-sm",
                    index === activeIndex ? "bg-slate-100" : "",
                    option.value === value ? "font-medium text-slate-900" : "text-slate-700",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.hint ? (
                      <span className="block truncate text-xs text-slate-400">{option.hint}</span>
                    ) : null}
                  </span>
                  {option.value === value ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  ) : null}
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

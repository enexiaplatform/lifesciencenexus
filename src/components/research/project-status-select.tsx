"use client";

import { useState, useTransition } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateResearchProjectStatusAction } from "@/app/(research)/research/actions";
import { RESEARCH_PROJECT_STATUSES, type ResearchProjectStatus } from "@/lib/domain/types";
import { humanize } from "@/components/search/entity-routes";

/** Project status selector wired to a server action. */
export function ProjectStatusSelect({
  projectId,
  status,
}: {
  projectId: string;
  status: ResearchProjectStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onChange(next: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateResearchProjectStatusAction({
        projectId,
        status: next as ResearchProjectStatus,
      });
      setMessage(result.ok ? "Status updated" : result.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="project-status" className="text-xs text-slate-500">
        Status
      </Label>
      <Select value={status} onValueChange={onChange} disabled={pending}>
        <SelectTrigger id="project-status" className="h-8 w-36 text-xs" aria-label="Project status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RESEARCH_PROJECT_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {humanize(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span aria-live="polite" className="sr-only">
        {message ?? ""}
      </span>
    </div>
  );
}

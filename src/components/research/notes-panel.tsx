"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StickyNote } from "lucide-react";

import type { EntityType } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { IsDemoBadge } from "@/components/evidence/meta-badges";
import { formatDateTime } from "@/components/evidence/format";
import { entityHref, entityTypeLabel } from "@/components/search/entity-routes";
import { addResearchNoteAction } from "@/app/(research)/research/actions";

export interface NoteItem {
  id: string;
  text: string;
  entityType?: EntityType;
  entityId?: string;
  createdAt: string;
  isDemo: boolean;
}

/** NOTES panel: chronological notes with an inline add form. */
export function NotesPanel({ projectId, notes }: { projectId: string; notes: NoteItem[] }) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await addResearchNoteAction({ projectId, text });
      if (result.ok) {
        setText("");
        setFeedback({ kind: "ok", message: "Note added" });
      } else {
        setFeedback({ kind: "error", message: result.error });
      }
    });
  }

  const sorted = [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <StickyNote className="h-4 w-4 text-slate-400" aria-hidden="true" />
          Notes
        </CardTitle>
        <CardDescription className="text-xs">
          Working notes captured during analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-500">No notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((note) => (
              <li key={note.id} className="rounded-md border border-slate-200 px-3 py-2">
                <p className="text-sm text-slate-800">{note.text}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{formatDateTime(note.createdAt)}</span>
                  {note.entityType && note.entityId && (
                    <Link
                      href={entityHref(note.entityType, note.entityId)}
                      className="text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      Linked {entityTypeLabel(note.entityType).toLowerCase()}
                    </Link>
                  )}
                  <IsDemoBadge isDemo={note.isDemo} />
                </p>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={submit} className="space-y-2">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Add a note…"
            aria-label="Add a note"
            className="min-h-[64px]"
          />
          <div className="flex items-center justify-between gap-2">
            <span
              aria-live="polite"
              className={
                feedback?.kind === "error" ? "text-xs text-red-600" : "text-xs text-teal-700"
              }
            >
              {feedback?.message ?? ""}
            </span>
            <Button type="submit" size="sm" disabled={pending || text.trim().length === 0}>
              {pending ? "Adding…" : "Add note"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

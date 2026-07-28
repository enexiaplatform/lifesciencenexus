"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { SOURCE_TYPES, type SourceType } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { humanize } from "@/components/search/entity-routes";
import { createSourceAction } from "@/app/(research)/sources/actions";

/** "Add source" dialog; `defaultOpen` supports /sources?dialog=add deep links. */
export function AddSourceDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<SourceType>("manufacturer_catalogue");
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [url, setUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [notes, setNotes] = useState("");

  function reset() {
    setType("manufacturer_catalogue");
    setTitle("");
    setPublisher("");
    setUrl("");
    setPublishedAt("");
    setNotes("");
    setError(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSourceAction({
        type,
        title,
        publisher: publisher || undefined,
        url: url || "",
        publishedAt: publishedAt || "",
        notes: notes || undefined,
      });
      if (result.ok) {
        setOpen(false);
        reset();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add source
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add source</DialogTitle>
          <DialogDescription>
            Register a piece of evidence — a catalogue, quotation, document, record or note.
            Capture time is set automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="source-type">Source type</Label>
            <Select value={type} onValueChange={(value) => setType(value as SourceType)}>
              <SelectTrigger id="source-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {humanize(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="source-title">Title</Label>
            <Input
              id="source-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              autoFocus
              placeholder="e.g. Distributor quotation Q-2026-021"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="source-publisher">Publisher (optional)</Label>
              <Input
                id="source-publisher"
                value={publisher}
                onChange={(event) => setPublisher(event.target.value)}
                placeholder="e.g. Mekong Lab Supply"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source-published-at">Published at (optional)</Label>
              <Input
                id="source-published-at"
                type="date"
                value={publishedAt}
                onChange={(event) => setPublishedAt(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="source-url">URL (optional)</Label>
            <Input
              id="source-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="source-notes">Notes (optional)</Label>
            <Textarea
              id="source-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Context about how this evidence was captured…"
              className="min-h-[64px]"
            />
          </div>
          <div aria-live="polite">
            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

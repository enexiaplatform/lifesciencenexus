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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createResearchProjectAction } from "@/app/(research)/research/actions";

/**
 * "Create research project" dialog. `defaultOpen` supports the
 * /research?dialog=create deep link from the dashboard quick actions.
 */
export function CreateProjectDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [scope, setScope] = useState("");
  const [geographyCodes, setGeographyCodes] = useState("");
  const [industryCodes, setIndustryCodes] = useState("");

  function reset() {
    setTitle("");
    setQuestion("");
    setScope("");
    setGeographyCodes("");
    setIndustryCodes("");
    setError(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createResearchProjectAction({
        title,
        question,
        scope: scope || undefined,
        geographyCodes: geographyCodes || undefined,
        industryCodes: industryCodes || undefined,
      });
      if (result.ok) {
        setOpen(false);
        reset();
        if (result.id) {
          router.push(`/research/${result.id}`);
        } else {
          router.refresh();
        }
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
          Create research project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create research project</DialogTitle>
          <DialogDescription>
            A workspace for one analytical question — collect entities, notes and findings,
            then export a report.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-title">Title</Label>
            <Input
              id="project-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              autoFocus
              placeholder="e.g. Vietnam ready-prepared media market"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-question">Research question</Label>
            <Textarea
              id="project-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              required
              placeholder="What question should this project answer?"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-scope">Scope (optional)</Label>
            <Input
              id="project-scope"
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              placeholder="e.g. Pharma QC laboratories, Vietnam, 2025-2026"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="project-geography">Geography codes</Label>
              <Input
                id="project-geography"
                value={geographyCodes}
                onChange={(event) => setGeographyCodes(event.target.value)}
                placeholder="VN, VN-SG"
              />
              <p className="text-xs text-slate-500">Comma-separated, e.g. VN or VN-SG.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-industry">Industry codes</Label>
              <Input
                id="project-industry"
                value={industryCodes}
                onChange={(event) => setIndustryCodes(event.target.value)}
                placeholder="pharma, food_beverage"
              />
              <p className="text-xs text-slate-500">Comma-separated industry codes.</p>
            </div>
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
              {pending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

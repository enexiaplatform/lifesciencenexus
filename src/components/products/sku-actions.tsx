"use client";

import { useState, useTransition } from "react";
import { FolderPlus } from "lucide-react";

import { MemoireHandoffDialog } from "@/components/products/memoire-handoff-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { BuildMemoireHandoffInput } from "@/lib/integrations/memoire";

export interface ProjectOption {
  id: string;
  title: string;
}

export type AddToProjectAction = (input: {
  projectId: string;
  skuId: string;
}) => Promise<{ ok: true } | { ok: false; error: string }>;

/**
 * SKU page action bar: "Add to research project" (server action passed in
 * from the page) and "Send to Memoire" (client-side handoff payload builder).
 */
export function SkuActions({
  skuId,
  skuName,
  projects,
  handoffInput,
  addToProject,
}: {
  skuId: string;
  skuName: string;
  projects: ProjectOption[];
  handoffInput: BuildMemoireHandoffInput;
  addToProject: AddToProjectAction;
}) {
  return (
    <>
      <AddToProjectDialog skuId={skuId} skuName={skuName} projects={projects} addToProject={addToProject} />
      <MemoireHandoffDialog input={handoffInput} fileName={`nexus-handoff-${skuId}.json`} />
    </>
  );
}

function AddToProjectDialog({
  skuId,
  skuName,
  projects,
  addToProject,
}: {
  skuId: string;
  skuName: string;
  projects: ProjectOption[];
  addToProject: AddToProjectAction;
}) {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await addToProject({ projectId, skuId });
      if (result.ok) {
        setDone(true);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={projects.length === 0}
        title={projects.length === 0 ? "No research projects in this workspace" : undefined}
        onClick={() => {
          setDone(false);
          setError(null);
          setOpen(true);
        }}
      >
        <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
        Add to research project
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to research project</DialogTitle>
            <DialogDescription>
              Link <span className="font-medium text-slate-700">{skuName}</span> to a research
              project as a tracked entity.
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <p
              role="status"
              className="rounded-md border border-teal-300 bg-teal-50 p-3 text-sm text-teal-800"
            >
              SKU linked to the project. Open the Research module to see it in the entity list.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="project-select">Research project</Label>
                <select
                  id="project-select"
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  aria-invalid={error ? true : undefined}
                  className="mt-1 flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="">Select a project…</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>
              {error ? (
                <p
                  role="alert"
                  className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800"
                >
                  {error}
                </p>
              ) : null}
            </div>
          )}

          <DialogFooter>
            {done ? (
              <Button type="button" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            ) : (
              <Button type="button" size="sm" disabled={!projectId || pending} onClick={submit}>
                {pending ? "Linking…" : "Add to project"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

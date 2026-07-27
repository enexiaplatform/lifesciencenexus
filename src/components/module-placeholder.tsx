import { Inbox } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  capabilities: string[];
  identifier?: string;
};

/**
 * Standard scaffold for a module page: page header plus an empty-state card
 * describing the capabilities the module will deliver.
 */
export function ModulePlaceholder({
  title,
  description,
  capabilities,
  identifier,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
        </div>
        {identifier ? (
          <Badge variant="outline" className="font-mono text-xs">
            ID: {identifier}
          </Badge>
        ) : null}
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Module under construction
          </CardTitle>
          <CardDescription>
            This shell is wired into navigation and routing. The capabilities
            below land in upcoming milestones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
            {capabilities.map((capability) => (
              <li key={capability}>{capability}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

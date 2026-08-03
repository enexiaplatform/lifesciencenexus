import type { ReactNode } from "react";

import { PageHeader as UiPageHeader } from "@/components/ui/page-header";

/**
 * Products-module page header — thin wrapper over the canonical
 * `ui/page-header`, adding a `badges` slot rendered inline with the title
 * (status / visibility / demo markers).
 */
export function PageHeader({
  title,
  description,
  badges,
  actions,
  breadcrumb,
  className,
}: {
  title: string;
  description?: string;
  badges?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
}) {
  return (
    <UiPageHeader
      title={
        badges ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            {title}
            {badges}
          </span>
        ) : (
          title
        )
      }
      description={description}
      actions={actions}
      breadcrumb={breadcrumb}
      className={className}
    />
  );
}

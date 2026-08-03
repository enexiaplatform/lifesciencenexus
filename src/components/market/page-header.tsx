import type { ReactNode } from "react";

import { PageHeader as UiPageHeader } from "@/components/ui/page-header";

/**
 * Market-module page header — thin wrapper over the canonical `ui/page-header`
 * (display-font title, description, right-aligned actions, optional breadcrumb).
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
}) {
  return (
    <UiPageHeader
      title={title}
      description={description}
      actions={actions}
      breadcrumb={breadcrumb}
      className={className}
    />
  );
}

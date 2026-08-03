import Link from "next/link";
import { Fragment } from "react";

import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Accessible breadcrumb trail. The final item is rendered as text with
 * aria-current="page"; intermediate items are links.
 */
export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-xs text-slate-500", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 ? (
                <li aria-hidden="true" className="select-none text-slate-300">
                  /
                </li>
              ) : null}
              <li>
                {isLast || !item.href ? (
                  <span aria-current={isLast ? "page" : undefined} className="font-medium text-slate-700">
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className="hover:text-spectral-600 hover:underline">
                    {item.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

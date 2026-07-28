import Link from "next/link";

import { cn } from "@/lib/utils";

import { Logo } from "./logo";

export interface WordmarkProps {
  /** When set, the lockup links (e.g. to "/"). */
  href?: string;
  /** Mark size in px; text scales with the lockup. */
  size?: number;
  /** Render the product name; set false for mark-only. */
  showText?: boolean;
  className?: string;
}

/**
 * Logo lockup: mark + "Life Science Nexus" in the display font
 * (Space Grotesk). Use in headers, auth screens, and the sidebar.
 */
export function Wordmark({
  href,
  size = 28,
  showText = true,
  className,
}: WordmarkProps) {
  const content = (
    <>
      <Logo size={size} title={showText ? null : "Life Science Nexus"} />
      {showText ? (
        <span className="font-display text-[15px] font-semibold tracking-tight">
          Life Science Nexus
        </span>
      ) : null}
    </>
  );

  const classes = cn(
    "inline-flex items-center gap-2.5 text-slate-900",
    href &&
      "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label="Life Science Nexus — home">
        {content}
      </Link>
    );
  }
  return <span className={classes}>{content}</span>;
}

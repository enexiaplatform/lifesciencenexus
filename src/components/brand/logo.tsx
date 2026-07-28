import { cn } from "@/lib/utils";

export interface LogoProps {
  /** Rendered width/height in px. */
  size?: number;
  /**
   * `color` — gradient navy→spectral rounded square with white mark.
   * `mono` — mark strokes only, inherits `currentColor` (for nav, footer).
   */
  variant?: "color" | "mono";
  /** Accessible name. Pass `null` to hide from assistive tech (decorative). */
  title?: string | null;
  className?: string;
}

/**
 * Life Science Nexus mark: a node-graph "N" — three nodes connected by edges
 * tracing an N silhouette inside a rounded square. The navy→spectral gradient
 * appears only in this mark (docs/BRAND.md).
 */
export function Logo({
  size = 32,
  variant = "color",
  title = "Life Science Nexus",
  className,
}: LogoProps) {
  const a11y =
    title === null
      ? { "aria-hidden": true as const }
      : { role: "img" as const, "aria-label": title };

  if (variant === "mono") {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={cn("shrink-0", className)}
        {...a11y}
      >
        <g
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M20 46 V18" />
          <path d="M20 18 L44 46" />
          <path d="M44 46 V18" />
        </g>
        <g fill="currentColor">
          <circle cx="20" cy="46" r="5.5" />
          <circle cx="20" cy="18" r="5.5" />
          <circle cx="44" cy="18" r="5.5" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...a11y}
    >
      <defs>
        <linearGradient
          id="nexus-mark-gradient"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="0" stopColor="#1B2B3A" />
          <stop offset="1" stopColor="#1D6FE0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#nexus-mark-gradient)" />
      <g
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M22 44 V20" />
        <path d="M22 20 L42 44" />
        <path d="M42 44 V20" />
      </g>
      <g fill="#FFFFFF">
        <circle cx="22" cy="44" r="5" />
        <circle cx="22" cy="20" r="5" />
        <circle cx="42" cy="20" r="5" />
      </g>
    </svg>
  );
}

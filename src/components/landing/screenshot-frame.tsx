import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Browser-chrome frame around a real product screenshot captured by
 * scripts/capture-screenshots.mjs (1280x800 @2x). Used on the landing page
 * to show the actual demo workspace instead of stylized mocks.
 */
export function ScreenshotFrame({
  src,
  alt,
  caption,
  priority = false,
  videoSrc,
  className,
}: {
  src: string;
  alt: string;
  /** Short label rendered in the chrome's address bar, e.g. "nexus /dashboard". */
  caption?: string;
  priority?: boolean;
  /** Optional walkthrough clip (webm) replacing the still image; `src` is the poster. */
  videoSrc?: string;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-2.5"
      >
        <span className="size-2 rounded-full bg-slate-300" />
        <span className="size-2 rounded-full bg-slate-300" />
        <span className="size-2 rounded-full bg-slate-300" />
        {caption ? (
          <span className="ml-3 truncate rounded bg-white px-2 py-0.5 font-mono text-[10px] leading-4 text-slate-500 ring-1 ring-slate-200 ring-inset">
            {caption}
          </span>
        ) : null}
      </div>
      {videoSrc ? (
        <video
          src={videoSrc}
          poster={src}
          aria-label={alt}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="h-auto w-full"
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={1280}
          height={800}
          priority={priority}
          className="h-auto w-full"
        />
      )}
    </figure>
  );
}

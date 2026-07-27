import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        404
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Page not found
      </h1>
      <p className="max-w-md text-sm text-slate-600">
        The page you are looking for does not exist or may have been moved.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex h-9 items-center rounded-md bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

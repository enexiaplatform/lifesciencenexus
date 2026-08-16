import { z } from "zod";

/**
 * Central, zod-validated environment configuration.
 *
 * Server-side only. Do NOT import this module from client components: Next.js
 * only inlines literal `process.env.NEXT_PUBLIC_*` member expressions into the
 * browser bundle, so reading env through this module in the browser would
 * always look "missing". Client code that needs the data backend should
 * receive it as a prop from a server component (see the route-group layouts).
 *
 * The module never throws: invalid or missing values fall back to safe
 * defaults, and missing Supabase credentials always resolve to demo mode.
 */

export type DataBackend = "supabase" | "demo";

const optionalUrl = z.string().url().optional().catch(undefined);
const optionalString = z.string().min(1).optional().catch(undefined);

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  /** Server-only. Must never be exposed to the browser. */
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  /** Explicit backend override. Default: auto-detect from Supabase vars. */
  NEXUS_DATA_BACKEND: z.enum(["supabase", "demo"]).optional().catch(undefined),
  NEXUS_DEMO_TENANT_ID: optionalString,
  NEXUS_ENABLE_AI_EXTRACTION: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .catch(undefined)
    .transform((value) => value === "true" || value === "1"),
  MEMOIRE_INTEGRATION_URL: optionalUrl,
  ATLAS_INTEGRATION_URL: optionalUrl,
  /** Public base URL of the deployment, used for sitemap/robots/metadata. */
  NEXT_PUBLIC_SITE_URL: optionalUrl,
});

export type NexusEnv = z.infer<typeof envSchema>;

function readEnv(): NexusEnv {
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) {
    return parsed.data;
  }
  // Defensive fallback: per-field .catch() should make this unreachable, but
  // never let env parsing crash the app.
  return envSchema.parse({});
}

export const env: NexusEnv = readEnv();

/** Supabase connection env, or null when not configured (demo mode). */
export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      url: env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };
  }
  return null;
}

/**
 * Resolve the active data backend. Explicit NEXUS_DATA_BACKEND wins;
 * otherwise Supabase is used when URL + anon key are present, else demo.
 */
export function getDataBackend(): DataBackend {
  if (env.NEXUS_DATA_BACKEND) {
    return env.NEXUS_DATA_BACKEND;
  }
  return getSupabaseEnv() ? "supabase" : "demo";
}

export function isDemoMode(): boolean {
  return getDataBackend() === "demo";
}

/** Server-only service-role key. Never call from code shipped to the browser. */
export function getServiceRoleKey(): string | null {
  return env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

export const demoTenantId = env.NEXUS_DEMO_TENANT_ID ?? "tenant_demo";

/** Public base URL of this deployment (no trailing slash). */
export const siteUrl = env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const featureFlags = {
  aiExtraction: env.NEXUS_ENABLE_AI_EXTRACTION,
} as const;

export const integrations = {
  memoireUrl: env.MEMOIRE_INTEGRATION_URL ?? null,
  atlasUrl: env.ATLAS_INTEGRATION_URL ?? null,
} as const;

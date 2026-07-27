import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Factory resolution tests. `@/lib/env` parses process.env at module load, so
 * each test resets the module registry and stubs env before importing.
 */
describe("getRepository factory", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns the demo backend when env is absent", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXUS_DATA_BACKEND", "");
    const { getRepository, resetRepositoryForTests } = await import("./index");
    resetRepositoryForTests();
    const repository = await getRepository();
    expect(repository.constructor.name).toBe("DemoRepository");
  });

  it("caches the resolved repository", async () => {
    vi.resetModules();
    vi.stubEnv("NEXUS_DATA_BACKEND", "demo");
    const { getRepository, resetRepositoryForTests } = await import("./index");
    resetRepositoryForTests();
    const first = await getRepository();
    const second = await getRepository();
    expect(second).toBe(first);
  });

  it("throws a clear not-implemented error for the supabase backend", async () => {
    vi.resetModules();
    vi.stubEnv("NEXUS_DATA_BACKEND", "supabase");
    const { getRepository, resetRepositoryForTests } = await import("./index");
    resetRepositoryForTests();
    await expect(getRepository()).rejects.toThrow(/not yet implemented/);
  });
});

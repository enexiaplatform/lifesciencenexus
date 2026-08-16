import { describe, expect, it } from "vitest";

import { decideAccess, isAuthEnabled, sanitizeNextPath } from "./gating";

describe("isAuthEnabled", () => {
  it("is false when Supabase env vars are not configured (test env)", () => {
    // The vitest environment sets no NEXT_PUBLIC_SUPABASE_* vars.
    expect(isAuthEnabled()).toBe(false);
  });
});

describe("decideAccess", () => {
  it("allows everything when auth is disabled (demo mode)", () => {
    expect(decideAccess("/dashboard", false, false)).toEqual({ allow: true });
    expect(decideAccess("/settings/team", false, false)).toEqual({
      allow: true,
    });
  });

  it("allows public exact paths anonymously when auth is enabled", () => {
    for (const path of [
      "/",
      "/pricing",
      "/contact",
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
    ]) {
      expect(decideAccess(path, false, true), path).toEqual({ allow: true });
    }
  });

  it("allows legal and auth prefixes anonymously", () => {
    expect(decideAccess("/legal/privacy", false, true)).toEqual({
      allow: true,
    });
    expect(decideAccess("/legal", false, true)).toEqual({ allow: true });
    expect(decideAccess("/auth/callback", false, true)).toEqual({
      allow: true,
    });
    expect(decideAccess("/auth/sign-out", false, true)).toEqual({
      allow: true,
    });
  });

  it("allows API routes anonymously (they carry their own x-api-key auth)", () => {
    expect(decideAccess("/api/v1/search", false, true)).toEqual({
      allow: true,
    });
    expect(decideAccess("/api", false, true)).toEqual({ allow: true });
  });

  it("allows metadata and screenshot routes anonymously", () => {
    for (const path of [
      "/manifest.webmanifest",
      "/robots.txt",
      "/sitemap.xml",
      "/icon.svg",
      "/apple-icon.png",
      "/favicon.ico",
      "/screenshots/dashboard.png",
    ]) {
      expect(decideAccess(path, false, true), path).toEqual({ allow: true });
    }
  });

  it("redirects anonymous workspace requests to /login with encoded next", () => {
    expect(decideAccess("/dashboard", false, true)).toEqual({
      allow: false,
      redirectTo: "/login?next=%2Fdashboard",
    });
    expect(decideAccess("/organizations/acme", false, true)).toEqual({
      allow: false,
      redirectTo: "/login?next=%2Forganizations%2Facme",
    });
  });

  it("allows workspace paths with a session", () => {
    expect(decideAccess("/dashboard", true, true)).toEqual({ allow: true });
    expect(decideAccess("/settings", true, true)).toEqual({ allow: true });
  });
});

describe("sanitizeNextPath", () => {
  it("keeps valid same-origin paths", () => {
    expect(sanitizeNextPath("/settings")).toBe("/settings");
    expect(sanitizeNextPath("/search?q=media")).toBe("/search?q=media");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeNextPath("//evil.com")).toBe("/dashboard");
  });

  it("rejects absolute URLs", () => {
    expect(sanitizeNextPath("https://evil.com/phish")).toBe("/dashboard");
  });

  it("falls back for null, undefined, and empty input", () => {
    expect(sanitizeNextPath(null)).toBe("/dashboard");
    expect(sanitizeNextPath(undefined)).toBe("/dashboard");
    expect(sanitizeNextPath("")).toBe("/dashboard");
  });

  it("rejects relative paths without a leading slash", () => {
    expect(sanitizeNextPath("dashboard")).toBe("/dashboard");
  });
});

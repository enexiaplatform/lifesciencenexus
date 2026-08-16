import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env";

/** Public + app routes (static list; detail pages are tenant-scoped). */
const routes = [
  "",
  "/dashboard",
  "/search",
  "/compare",
  "/cost-per-test",
  "/equivalence",
  "/matching",
  "/prices",
  "/signals",
  "/availability",
  "/installed-base",
  "/laboratories",
  "/manufacturers",
  "/organizations",
  "/people",
  "/sites",
  "/suppliers",
  "/tenders",
  "/applications",
  "/brands",
  "/methods",
  "/organisms",
  "/products",
  "/skus",
  "/standards",
  "/evidence",
  "/research",
  "/review",
  "/sources",
  "/exports",
  "/imports",
  "/admin",
  "/settings",
];

/** Marketing surface: conversion pages rank above legal pages. */
const marketingRoutes: Array<{ path: string; priority: number }> = [
  { path: "/pricing", priority: 0.8 },
  { path: "/contact", priority: 0.8 },
  { path: "/legal/privacy", priority: 0.3 },
  { path: "/legal/terms", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-16");
  return [
    ...routes.map((route) => ({
      url: `${siteUrl}${route}`,
      lastModified,
      changeFrequency: route === "" ? ("weekly" as const) : ("daily" as const),
      priority: route === "" ? 1 : 0.7,
    })),
    ...marketingRoutes.map((route) => ({
      url: `${siteUrl}${route.path}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: route.priority,
    })),
  ];
}

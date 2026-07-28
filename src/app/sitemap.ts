import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-28");
  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified,
    changeFrequency: route === "" ? "weekly" : "daily",
    priority: route === "" ? 1 : 0.7,
  }));
}

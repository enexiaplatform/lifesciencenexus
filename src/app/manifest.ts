import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Life Science Nexus",
    short_name: "Nexus",
    description:
      "Industry and Product Intelligence Graph for life science markets.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#1B2B3A",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
  };
}

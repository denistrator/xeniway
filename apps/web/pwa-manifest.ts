import type { ManifestOptions } from "vite-plugin-pwa";

export const pwaManifest = {
  id: "/",
  name: "Xenia Way",
  short_name: "Xenia Way",
  description: "A private workspace for tracking job applications, employer conversations, follow-ups, and outcomes.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  theme_color: "#f5f3ee",
  background_color: "#f5f3ee",
  icons: [
    { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
} satisfies Partial<ManifestOptions>;

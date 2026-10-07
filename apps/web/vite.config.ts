import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";
import { pwaManifest } from "./pwa-manifest.ts";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src/features/offline",
      filename: "service-worker.ts",
      injectRegister: false,
      manifest: pwaManifest,
      includeManifestIcons: false,
      registerType: "prompt",
      integration: {
        async beforeBuildServiceWorker(options) {
          // Workbox appends plugin-generated entries after manifestTransforms.
          // Hash their emitted bytes too; the worker intentionally rejects MD5 revisions.
          options.injectManifest.additionalManifestEntries = await Promise.all(
            (options.injectManifest.additionalManifestEntries ?? []).map(async (entry) => {
              if (typeof entry === "string" || entry.revision === null) {
                return entry;
              }
              return {
                ...entry,
                revision: createHash("sha256")
                  .update(await readFile(new URL(`./dist/${entry.url}`, import.meta.url)))
                  .digest("hex"),
              };
            }),
          );
        },
      },
      injectManifest: {
        globPatterns: [
          "index.html",
          "assets/**/*.{js,css,png,svg,ico,woff,woff2}",
          "favicon.{ico,png}",
          "pwa-{192,512,maskable-512}.png",
          "apple-touch-icon.png",
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        manifestTransforms: [
          async (entries) => ({
            manifest: await Promise.all(
              entries.map(async (entry) =>
                entry.revision === null
                  ? entry
                  : {
                      ...entry,
                      revision: createHash("sha256")
                        .update(await readFile(new URL(`./dist/${entry.url}`, import.meta.url)))
                        .digest("hex"),
                    },
              ),
            ),
            warnings: [],
          }),
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    modulePreload: {
      // Initial HTML hints can conflict with service-worker cache responses in Chromium.
      // Keep dependency preloading for dynamic imports, including lazy routes.
      resolveDependencies: (_filename, dependencies, context) => (context.hostType === "html" ? [] : dependencies),
    },
  },
  server: {
    host: "127.0.0.1",
    port: Number(process.env.VITE_PORT ?? 5173),
    proxy: {
      "/api": `http://127.0.0.1:${process.env.API_PORT ?? "3000"}`,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});

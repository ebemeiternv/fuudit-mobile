import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
import { VitePWA } from "vite-plugin-pwa";

// Short, non-sensitive build identifier for tester version confirmation.
// Uses a base36 timestamp — no commit hash, no secrets.
const BUILD_ID = Date.now().toString(36);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mcpPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      filename: "sw.js",
      devOptions: { enabled: false },
      includeAssets: [
        "favicon.ico",
        "icons/apple-touch-icon.png",
        "icons/favicon-16.png",
        "icons/favicon-32.png",
      ],
      manifest: {
        name: "Fuudit",
        short_name: "Fuudit",
        description:
          "A kitchen companion that remembers — track your pantry, cook with what you have, and waste less.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        lang: "en",
        dir: "ltr",
        theme_color: "#327853",
        background_color: "#fafaf7",
        categories: ["food", "lifestyle", "productivity"],
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        // Single navigation-shell strategy: NetworkFirst runtime route below
        // owns HTML. index.html is intentionally NOT precached so a stale
        // active worker cannot serve an old shell from precache.
        globPatterns: ["**/*.{js,css,ico,png,svg,woff,woff2}"],
        runtimeCaching: [
          {
            // HTML navigations — always try network first
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "fuudit-html",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            // Google fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Recipe images (Spoonacular / OFF) — conservative, opaque OK
            urlPattern:
              /^https:\/\/(img\.spoonacular\.com|spoonacular\.com|images\.openfoodfacts\.org|world\.openfoodfacts\.org)\//,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "recipe-images",
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

// Build identifier injected at build time via vite `define`.
// Not a secret — safe to display in the UI for tester version confirmation.
declare const __BUILD_ID__: string;

export const BUILD_ID: string =
  typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";

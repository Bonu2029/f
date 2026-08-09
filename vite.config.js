import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* SINGLE=1 produces one self-contained HTML file that runs from file://
   (see scripts/build-single.mjs). Browsers refuse to load ES modules over
   file://, so that build emits a classic IIFE bundle instead. */
const single = process.env.SINGLE === "1";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { host: true, port: 5173 },
  build: single
    ? {
        outDir: "dist-single",
        assetsInlineLimit: 100000000,
        cssCodeSplit: false,
        rollupOptions: {
          output: {
            format: "iife",
            inlineDynamicImports: true,
            entryFileNames: "app.js",
            assetFileNames: "app.[ext]",
          },
        },
      }
    : {},
});

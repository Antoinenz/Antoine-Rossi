import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath, URL } from "node:url";

// Source lives in site/; the production build is emitted into the repo root
// (index.html + assets/) and committed, because the host serves the repo
// root as-is. Run `npm run build` before committing site changes.
export default defineConfig({
  root: "site",
  plugins: [react(), cloudflare()],
  build: {
    outDir: "..",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./site/index.html", import.meta.url)),
        work: fileURLToPath(new URL("./site/work.html", import.meta.url)),
      },
    },
  },
});
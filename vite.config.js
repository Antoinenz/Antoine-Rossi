import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Source lives in site/; the production build is emitted into the repo root
// (index.html + assets/) and committed, because the host serves the repo
// root as-is. Run `npm run build` before committing site changes.
export default defineConfig({
  root: "site",
  plugins: [react()],
  build: {
    outDir: "..",
    emptyOutDir: false,
  },
});

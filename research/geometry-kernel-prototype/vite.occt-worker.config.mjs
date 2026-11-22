import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  configFile: false,
  publicDir: false,
  build: {
    outDir: resolve(here, "dist-production"),
    emptyOutDir: true,
    lib: {
      entry: resolve(here, "production-worker.js"),
      formats: ["es"],
      fileName: () => "silmo-occt-worker.js"
    },
    rollupOptions: {
      output: { inlineDynamicImports: true }
    }
  }
});

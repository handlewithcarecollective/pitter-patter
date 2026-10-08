import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Serves the test harness. `@pitter-patter/shuffle` is aliased to the package
 * source so the tests always exercise the code under test, not `dist`.
 */
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@pitter-patter/shuffle/style/shuffle.css",
        replacement: fileURLToPath(new URL("../../style/shuffle.css", import.meta.url)),
      },
      {
        find: "@pitter-patter/shuffle",
        replacement: fileURLToPath(new URL("../../src/index.ts", import.meta.url)),
      },
    ],
  },
  server: { host: "127.0.0.1", port: 5199, strictPort: true },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ["./src/__tests__/setup.ts"],
    // All test files share one external Mongo test database (see setup.ts) — running
    // them in parallel lets one file's afterEach cleanup race another file's assertions.
    fileParallelism: false,
  },
});

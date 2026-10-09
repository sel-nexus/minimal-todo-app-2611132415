import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  workers: 1,
  reporter: [["json", { outputFile: "test-results/e2e-results.json" }], ["list"]],
  use: {
    browserName: "chromium",
    headless: true,
    trace: "retain-on-failure",
  },
});

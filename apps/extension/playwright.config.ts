import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  reporter: "list",
  timeout: 30000,
  use: {
    ...devices["Desktop Chrome"],
    trace: "on-first-retry",
  },
});

import { defineConfig } from "@playwright/test";
import process from "node:process";

const chromiumExecutable = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"];
const previewPort = Number(process.env["PLAYWRIGHT_PREVIEW_PORT"] ?? 4321);

if (!Number.isInteger(previewPort) || previewPort < 1 || previewPort > 65535) {
  throw new Error(
    "PLAYWRIGHT_PREVIEW_PORT must be an integer from 1 to 65535.",
  );
}

const previewURL = `http://127.0.0.1:${previewPort}`;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: previewURL,
    browserName: "chromium",
    ...(chromiumExecutable
      ? {
          launchOptions: {
            executablePath: chromiumExecutable,
          },
        }
      : {}),
  },
  webServer: {
    command: `npm run preview -- --port ${previewPort}`,
    url: previewURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

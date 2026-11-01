import { writeFile, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";

// A whitespace-only local override prevents Secret Manager/OpenAI calls when
// no developer key exists. The emulator treats an empty string as absent and
// otherwise tries Secret Manager. Never overwrite an existing local key file.
const smoke = process.argv.includes("--smoke");
const override = new URL("../.secret.local", import.meta.url);
let created = false;
try {
  await writeFile(override, 'OPENAI_API_KEY=" "\n', { flag: "wx" });
  created = true;
} catch (error) {
  if (
    !(error instanceof Error) ||
    !("code" in error) ||
    error.code !== "EEXIST" ||
    smoke
  ) {
    throw error;
  }
}
try {
  const child = spawn(
    process.execPath,
    [
      "node_modules/firebase-tools/lib/bin/firebase.js",
      smoke ? "emulators:exec" : "emulators:start",
      "--config",
      "../firebase.prototype.json",
      "--project",
      "demo-meridian-station",
      "--only",
      "functions",
      ...(smoke ? ["node tests/emulator-smoke.mjs"] : []),
    ],
    {
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "production" },
    },
  );
  process.exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
} finally {
  if (created) await unlink(override);
}

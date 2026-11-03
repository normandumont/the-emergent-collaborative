import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const mode = process.argv[2] ?? "--production";

async function check(directory) {
  const issues = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      issues.push(...(await check(filename)));
    } else if (entry.name.endsWith(".html")) {
      const html = await readFile(filename, "utf8");
      if (
        /data-placeholder=|IMPLEMENTATION PLACEHOLDER|INCOMPLETE IMPLEMENTATION PREVIEW/i.test(
          html,
        )
      ) {
        issues.push(
          `${path.relative(dist, filename)} contains unresolved publication markers.`,
        );
      }
      if (
        mode === "--production" &&
        /<meta\b(?=[^>]*\bname\s*=\s*["']robots["'])(?=[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b)[^>]*>/i.test(
          html,
        )
      ) {
        issues.push(
          `${path.relative(dist, filename)} contains a robots noindex directive.`,
        );
      }
    }
  }
  return issues;
}

try {
  if (
    process.argv.length > 3 ||
    !["--preview", "--production"].includes(mode)
  ) {
    throw new Error(
      "Usage: node scripts/release-check.mjs [--preview|--production]",
    );
  }
  const issues = await check(dist);
  if (issues.length) {
    console.error(
      `${mode === "--preview" ? "Preview readiness" : "Release"} blocked:\n` +
        issues.join("\n"),
    );
    process.exitCode = 1;
  } else {
    console.log(
      "No scaffold markers found. This check does not authorize deployment or replace founder release approval.",
    );
  }
} catch (error) {
  console.error(
    "Release check could not inspect a complete static build:",
    error,
  );
  process.exitCode = 1;
}

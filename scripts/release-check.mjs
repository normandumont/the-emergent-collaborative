import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

async function check(directory) {
  const issues = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      issues.push(...(await check(filename)));
    } else if (entry.name.endsWith(".html")) {
      const html = await readFile(filename, "utf8");
      if (
        /data-placeholder=|IMPLEMENTATION PLACEHOLDER|INCOMPLETE IMPLEMENTATION PREVIEW|name="robots" content="noindex/i.test(
          html,
        )
      ) {
        issues.push(
          `${path.relative(dist, filename)} contains unresolved publication markers.`,
        );
      }
    }
  }
  return issues;
}

try {
  const issues = await check(dist);
  if (issues.length) {
    console.error("Release blocked:\n" + issues.join("\n"));
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

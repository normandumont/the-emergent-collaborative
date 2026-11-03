import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

const checker = new URL("../scripts/release-check.mjs", import.meta.url);
const cases = [
  ["plain HTML", "<p>Reviewed content</p>", 0, 0],
  ["noindex", '<meta name="robots" content="noindex">', 0, 1],
  [
    "noindex and nofollow",
    '<meta name="robots" content="noindex, nofollow">',
    0,
    1,
  ],
  [
    "reordered robots attributes",
    "<meta content='nofollow, NOINDEX' name='robots'>",
    0,
    1,
  ],
  ["placeholder attribute", '<p data-placeholder="PH-04">Draft</p>', 1, 1],
  ["placeholder text", "<p>IMPLEMENTATION PLACEHOLDER</p>", 1, 1],
  ["implementation preview", "<p>INCOMPLETE IMPLEMENTATION PREVIEW</p>", 1, 1],
];

for (const [name, html, previewStatus, productionStatus] of cases) {
  test(`readiness modes: ${name}`, async (t) => {
    const directory = await mkdtemp(
      path.join(tmpdir(), "meridian-release-check-"),
    );
    t.after(() => rm(directory, { recursive: true, force: true }));
    await mkdir(path.join(directory, "scripts"));
    await mkdir(path.join(directory, "dist", "nested"), { recursive: true });
    const script = path.join(directory, "scripts", "release-check.mjs");
    await copyFile(checker, script);
    await writeFile(path.join(directory, "dist", "nested", "index.html"), html);

    for (const [args, expected] of [
      [[], productionStatus],
      [["--production"], productionStatus],
      [["--preview"], previewStatus],
    ]) {
      const result = spawnSync(process.execPath, [script, ...args], {
        encoding: "utf8",
      });
      assert.equal(result.status, expected, result.stderr || result.stdout);
    }

    for (const args of [["--unknown"], ["--preview", "--production"]]) {
      const result = spawnSync(process.execPath, [script, ...args], {
        encoding: "utf8",
      });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Usage:/);
    }
  });
}

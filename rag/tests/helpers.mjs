import { readFile, mkdtemp, readdir, unlink, rmdir } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { LocalStore } from "../lib/shared/storage.js";
import { loadConfig } from "../lib/shared/config.js";

export const fixture = (name) =>
  readFile(new URL(`fixtures/${name}`, import.meta.url), "utf8");
export const config = () => loadConfig({});
export function clock(start = Date.parse("2026-10-31T12:00:00Z")) {
  let now = start;
  const delays = [];
  return {
    now: () => now,
    sleep: async (ms) => {
      delays.push(ms);
      now += ms;
    },
    delays,
  };
}
export function searchBody(ids, count = ids.length) {
  return JSON.stringify({
    esearchresult: {
      count: String(count),
      idlist: ids,
      webenv: "fixture-history",
      querykey: "1",
    },
  });
}
export async function temporaryStore(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "meridian-rag-test-"));
  // Delete only the exact files and directories created by this fixture run.
  async function clean(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await clean(file);
      else await unlink(file);
    }
    await rmdir(directory);
  }
  t.after(() => clean(directory));
  return new LocalStore(directory);
}

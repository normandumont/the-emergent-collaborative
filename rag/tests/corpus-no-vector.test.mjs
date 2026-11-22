import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));

test("discovery, preparation and reporting import graphs cannot reach vector/OpenAI modules", async () => {
  const visited = new Set();
  async function inspect(relative) {
    const filename = path.resolve(root, relative);
    if (visited.has(filename)) return;
    visited.add(filename);
    assert.ok(
      !/[\\/]indexing[\\/]|[\\/]retrieval[\\/]|[\\/]evaluation[\\/]/.test(
        filename,
      ),
      filename,
    );
    const text = await readFile(filename, "utf8");
    const source = ts.createSourceFile(
      filename,
      text,
      ts.ScriptTarget.Latest,
      true,
    );
    const imports = [];
    function walk(node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier
      )
        imports.push(node.moduleSpecifier.text);
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          node.expression.getText(source) === "require")
      ) {
        assert.equal(node.arguments.length, 1);
        assert.ok(
          ts.isStringLiteral(node.arguments[0]),
          "Dynamic module names are not allowed in the no-vector workflow",
        );
        imports.push(node.arguments[0].text);
      }
      ts.forEachChild(node, walk);
    }
    walk(source);
    for (const specifier of imports) {
      assert.ok(
        !/openai|vector-sync|vector-client/i.test(specifier),
        `${relative}: ${specifier}`,
      );
      if (specifier.startsWith("."))
        await inspect(
          path.relative(
            root,
            path.resolve(
              path.dirname(filename),
              specifier.replace(/\.js$/, ".ts"),
            ),
          ),
        );
    }
  }
  for (const entry of [
    "scripts/discover-all.ts",
    "scripts/prepare-corpus.ts",
    "scripts/corpus-report.ts",
    "scripts/repair-corpus.ts",
    "scripts/test-pmc.ts",
  ])
    await inspect(entry);
  assert.ok(visited.size > 15);
  const parent = JSON.parse(
    await readFile(path.join(root, "..", "package.json"), "utf8"),
  );
  const local = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8"),
  );
  for (const name of ["discover-all", "prepare", "corpus-report"]) {
    assert.ok(!/vector|openai/.test(local.scripts[name]));
    assert.ok(
      !/vector|openai/.test(
        parent.scripts[`rag:${name === "prepare" ? "prepare" : name}`],
      ),
    );
  }
});

test("guarded runtime completes mock acquisition, cache-only preparation and reports with zero OpenAI calls", () => {
  const script = `
    import assert from "node:assert/strict";
    import { registerHooks } from "node:module";
    import { mkdtemp, readFile, rm } from "node:fs/promises";
    import { tmpdir } from "node:os";
    import path from "node:path";
    let vectorAttempts = 0, unapprovedNetwork = 0;
    registerHooks({ resolve(specifier, context, nextResolve) {
      if (/openai|[\\\\/]indexing[\\\\/]|vector-sync/i.test(specifier)) {
        vectorAttempts++;
        throw new Error("Forbidden vector module");
      }
      return nextResolve(specifier, context);
    }});
    globalThis.fetch = async () => { unapprovedNetwork++; throw new Error("Unexpected network"); };
    process.env.OPENAI_API_KEY = "unused-fixture-key";
    const { loadConfig } = await import("./lib/shared/config.js");
    const { LocalStore } = await import("./lib/shared/storage.js");
    const { PubmedClient } = await import("./lib/discovery/pubmed-client.js");
    const { discoverAll, discoveryOptions } = await import("./lib/discovery/discover-all.js");
    const { prepareCorpus } = await import("./lib/corpus/prepare.js");
    const { loadCorpusConfig } = await import("./lib/corpus/config.js");
    const { generateCorpusReport } = await import("./lib/corpus/report.js");
    const directory = await mkdtemp(path.join(tmpdir(), "meridian-no-vector-"));
    try {
      const store = new LocalStore(directory);
      const cfg = await loadConfig({});
      cfg.queries = cfg.queries.filter(query => query.id === "pd_exercise");
      await discoverAll(cfg, store, discoveryOptions(["--dry-run"]));
      let time = 0;
      const client = new PubmedClient(cfg, async (url) => {
        assert.ok(["eutils.ncbi.nlm.nih.gov", "pmc.ncbi.nlm.nih.gov"].includes(new URL(url).hostname));
        if (String(url).endsWith("esearch.fcgi"))
          return new Response(JSON.stringify({ esearchresult: {
            count: "3", idlist: ["10001", "10002", "10003"], webenv: "fixture", querykey: "1"
          }}));
        const name = String(url).endsWith("efetch.fcgi") ? "pubmed.xml" :
          new URL(url).searchParams.get("metadataPrefix") === "pmc_fm" ? "pmc-metadata.xml" : "pmc-full.xml";
        return new Response(await readFile(path.join("tests", "fixtures", name), "utf8"));
      }, { now: () => time, sleep: async ms => { time += ms; } });
      const run = await discoverAll(cfg, store, discoveryOptions(["--execute"]), client);
      assert.equal(run.status, "completed");
      assert.equal(run.summary.normalized, 3);
      assert.equal((await prepareCorpus(store, cfg)).errors, 0);
      const report = await generateCorpusReport(store, await loadCorpusConfig());
      assert.equal(report.readiness.issues.length, 0);
      assert.equal(vectorAttempts, 0);
      assert.equal(unapprovedNetwork, 0);
      console.log("ZERO_OPENAI_VECTOR_CALLS");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  `;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", script],
    { cwd: root, encoding: "utf8", timeout: 60_000 },
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.ok(result.stdout.includes("ZERO_OPENAI_VECTOR_CALLS"));
});

import test from "node:test";
import assert from "node:assert/strict";
import { temporaryStore } from "./helpers.mjs";
import { LocalStore } from "../lib/shared/storage.js";
import { readManifest } from "../lib/corpus/manifest.js";
import { readState, saveState, currentStore } from "../lib/indexing/state.js";
import { DEVELOPMENT_SCOPE } from "../lib/indexing/vector-store.js";
import { OpenAIVectorApi, sdkClient } from "../lib/indexing/openai-client.js";
import { indexable } from "../lib/indexing/metadata.js";
import { synchronize } from "../lib/indexing/reconcile.js";
import { searchVector } from "../lib/retrieval/search.js";

test(
  "optional live development vector upload/search/removal smoke test",
  {
    skip: process.env.RAG_LIVE_VECTOR_TEST !== "1",
    timeout: 600_000,
  },
  async (t) => {
    const id = process.env.OPENAI_RAG_VECTOR_STORE_ID;
    assert.ok(
      id && process.env.RAG_LIVE_VECTOR_CONFIRM === id,
      "Explicit development ID and exact RAG_LIVE_VECTOR_CONFIRM are required.",
    );
    const source = new LocalStore();
    const isolated = await temporaryStore(t);
    const api = new OpenAIVectorApi(sdkClient());
    await source.locked(async () => {
      const state = await readState(source);
      const target = currentStore(state, id);
      const remote = await api.getStore(id);
      assert.ok(
        target.owned &&
          target.smokeTest &&
          !target.files.length &&
          !target.pendingUpload &&
          !target.pendingBatch,
      );
      assert.equal(remote.metadata?.scope, DEVELOPMENT_SCOPE);
      assert.equal(remote.metadata?.workspace, state.ownerId);
      assert.equal(remote.metadata?.mode, "smoke-test");
      assert.equal(
        (await api.listFiles(id)).length,
        0,
        "Smoke test refuses a nonempty/shared vector store.",
      );
      const manifest = await readManifest(source);
      assert.ok(manifest);
      const entries = manifest.entries.filter(indexable).slice(0, 2);
      assert.equal(
        entries.length,
        2,
        "Prepare at least two eligible corpus documents.",
      );
      const copy = async (relative) => {
        const text = await source.read(relative);
        assert.notEqual(text, null);
        await isolated.write(
          relative,
          text,
          (await isolated.read(relative)) !== null,
        );
      };
      for (const entry of entries) {
        await copy(`retrieval/${entry.path}`);
        await copy(`normalized/${entry.pmid}.json`);
        const governed = `corpus/versions/${entry.pmid}/${entry.normalizedRecordSha256}.json`;
        await copy(governed);
        const record = await source.json(governed);
        for (const provenance of record.source.provenance)
          await copy(provenance.rawPath);
      }
      await isolated.writeJson("retrieval/manifest.json", {
        ...manifest,
        entries,
      });
      await saveState(isolated, state);
      try {
        const first = await synchronize(api, isolated);
        assert.equal(first.uploaded, 2);
        assert.equal(first.failed, 0);
        const found = await searchVector(
          api,
          isolated,
          "exercise and Parkinson's disease",
          { maxResults: 50 },
        );
        assert.ok(
          found.results.some((result) =>
            entries.some((entry) => entry.pmid === result.pmid),
          ),
        );
        const removedPmid = entries[0].pmid;
        entries[0] = {
          ...entries[0],
          retrievalEnabled: false,
          status: "retrieval-disabled",
          indexAction: "remove",
        };
        await isolated.versionedJson("retrieval/manifest.json", {
          ...manifest,
          entries,
        });
        assert.equal((await synchronize(api, isolated)).removed, 1);
        const after = await searchVector(
          api,
          isolated,
          "exercise and Parkinson's disease",
          { maxResults: 50 },
        );
        assert.ok(after.results.every((result) => result.pmid !== removedPmid));
        assert.equal(
          (await readState(isolated)).stores[id].files.filter(
            (file) => file.status === "removed",
          ).length,
          1,
        );
      } finally {
        // Preserve receipts in the real ignored state even if indexing/cleanup fails.
        const latest = await readState(isolated);
        await saveState(source, latest);
        const owned = await api.getStore(id);
        assert.equal(owned.metadata?.workspace, latest.ownerId);
        assert.equal(owned.metadata?.scope, DEVELOPMENT_SCOPE);
        assert.equal(owned.metadata?.mode, "smoke-test");
        for (const file of latest.stores[id].files) {
          await api.detach(id, file.fileId);
          file.status = "removed";
          await saveState(source, latest);
          await api.deleteFile(file.fileId);
        }
        latest.stores[id].pendingBatch = null;
        await saveState(source, latest);
        assert.equal(
          latest.stores[id].files.filter((file) => file.status === "removed")
            .length,
          latest.stores[id].files.length,
        );
      }
    });
  },
);

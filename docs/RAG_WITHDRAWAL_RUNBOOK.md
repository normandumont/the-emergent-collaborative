# RAG withdrawal / retraction runbook

Operational instructions only. **No governance change, vector synchronization or
deployment is authorized by this document.** Use the preview project first.

## Contain exposure

Disable RAG before changing governance if a paper must be withdrawn urgently.
`RAG_ENABLED=false` preserves the non-RAG path. The current Firebase Boolean
parameter is an environment value, not live Remote Config. Changing the running
service's configuration creates a new Cloud Run revision; it does not require
changing or rebuilding source code. It is not an instantaneous in-process kill
switch.

An authorized operator can use Cloud Run's environment configuration UI, or:

```powershell
gcloud run services update askparkinsons --project meridian-station-preview --region us-central1 --update-env-vars RAG_ENABLED=false
```

Confirm the actual backing service using the function's service configuration
before executing. Preserve the Secret Manager binding. Record the disabled value
in the approved Firebase parameter/environment configuration as well, so a later
source deployment does not inadvertently restore the old value. Configuration
revisions/deployments remain human-approved operations; none were performed here.

## Withdraw and verify

1. **Update local governance.** Review the publisher/PubMed notice and provenance.
   For a confirmed notice, explicitly refresh the affected public records:
   `npm.cmd run rag:ingest -- <PMID> --refresh` (and the notice PMID when needed).
   For an immediate reviewed manual exclusion, add the PMID to
   `retrievalDisabledPmids` in `rag\config\corpus-policy.json` and increment the
   policy version under the existing governance rules. Do not edit raw snapshots,
   fabricate publication flags, delete history, or automatically reinstate a paper.
2. **Prepare the corpus:** `npm.cmd run rag:prepare`, then
   `npm.cmd run rag:corpus`. Confirm the paper is non-retrievable and its removal
   decision, provenance and history were retained. Review the impact on other
   papers; changing policy provenance can require more work than a single removal.
3. **Regenerate the runtime whitelist** with the exporter below. It deliberately
   refuses stale synchronization receipts or pending work. Do not bypass that
   verification to obtain an export.
4. **Synchronize only when required and separately approved.** With this exporter,
   a changed governance manifest requires synchronized state acknowledgement
   before the final export can succeed. Review `npm.cmd run rag:vector:status`;
   use `npm.cmd run rag:vector:sync` only with approval for its removals,
   metadata updates and any required re-indexing. Stop on pending/errors.
   If a large-sync cap is reached, review/approve the scope instead of casually
   adding `--allow-large-sync`. Then repeat step 3. This ordering dependency means
   a final verified export may follow synchronization, not precede it.
5. **Validate locally.** Run the commands below. Inspect retrieval for the paper's
   title/distinctive public concepts; confirm the withdrawn PMID is absent.
   Run exclusion regression tests and review changed runtime metadata/checksum.
6. **Deploy the reviewed function** only with explicit approval; keep RAG disabled
   until the new package and its checksum are confirmed. The command below targets
   preview only. Do not copy it to a production project without separate approval.
7. **Verify serving behavior.** Confirm the deployed revision has the new manifest,
   enable RAG through approved configuration, and repeat the static public
   retrieval questions in the preview UI/smoke suite. Confirm the old PMID is not
   returned or cited, safety logs are clean, and fallback still works.
   Remote search can be eventually consistent; the current local whitelist must
   exclude the paper even if an old remote result is still returned.

```powershell
# Only during a separately authorized withdrawal operation:
npm.cmd --prefix rag run runtime-manifest -- --store-id vs_6aee7894bc2c8191b9ddf52a1a8baee6
npm.cmd --prefix functions run rag:manifest:check
npm.cmd --prefix rag test
npm.cmd --prefix functions test
npm.cmd run rag:search-vector -- "distinctive public paper title or concept" --papers 5 --candidate-limit 50 --debug-ranking

# Only after explicit deployment approval:
.\functions\node_modules\.bin\firebase.cmd deploy --config firebase.prototype.json --project meridian-station-preview --only functions:askParkinsons
```

The package requires both `functions\runtime-manifest.json` and
`functions\runtime-manifest.sha256`. The checksum detects byte changes, not
scientific truth, malicious replacement of both files, or new external retractions.
Do not treat a successful HTTP response as proof that a withdrawn PMID is absent.
Do not persist question/answer bodies or private health information as incident
evidence. Retain safe revision identifiers, decision records and aggregate checks.

If verification fails, **leave RAG disabled**. Do not roll back to a snapshot
known to include the withdrawn paper just to restore availability.

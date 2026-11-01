# Meridian Station — Controlled Firebase Hosting Preview Plan

**Status: local update only. Do not execute deployment/setup commands now.**

## Current clarification — 29 October 2026

The founder reports that verification-only project **`meridian-station-preview`**
and preview channel **`founder-review`** already exist. This supersedes the
23 October no-project/pre-creation situation recorded below. This task neither
created nor remotely inspected them; no hosted privacy facts, account/billing,
region, canonical URL, expiry or actual default-site identity are inferred.
The source update restores the ride-derived knowledge-resource/longitudinal
direction, revises PH-17, and adds small royal-blue concept rules; it changes no
Hosting configuration or privacy promises.

For the **next separately authorized update**, use these known project/channel
values rather than creating replacements. Verify the actual site, deployer,
permissions, existing channel/expiry and exact reviewed revision/build before any
side effect. The later workflow below still applies, but section 3 creation
instructions are historical contingency guidance, not a request to create/init
anything. Never run them merely because local `.firebaserc` is absent.

Only after explicit update permission, the identifier step in section 5 would use:

```powershell
# LATER ONLY; identifiers are founder-supplied, not proof of authenticated access.
$ProjectId = 'meridian-station-preview'
$ChannelId = 'founder-review'
```

The existing later-only preview command remains unchanged. This pass adds no live
deployment command, deployment automation or domain configuration. Approve the
actual expiry rather than treating the older proposed 7d as an existing setting.
After a future update, record its returned URL/version, HTTPS/CSP/cache/404,
network/cookies/all storage/font results, and resolve PH-10/11 using observed
configuration **plus provider evidence**. Headers alone cannot prove retention
or international processing. PH-13/14 need actual approved notice dates; PH-04
may remain draft only under explicit preview permission. Until then this is not
EXTERNAL PREVIEW READY for circulation, and never PRODUCTION READY.

## Original preparation plan — 23 October 2026 (preserved)

At that phase, the founder authorized repository preparation for the next preview step, not Firebase project creation/connection, authentication, test upload, production deployment, or connecting `meridianstation.org` to Hosting. This plan and the current [release-readiness register](RELEASE_READINESS.md) supersede historical all-20-open/inactive-contact instructions. No Firebase CLI, credentials, project ID, `.firebaserc`, canonical URL, region, account identity or billing configuration was added by that task.

## 1. Purpose and exposure boundary

Validate the existing static Astro 6 build on an actual Firebase Hosting **preview channel**, with no backend services or client Firebase SDK. A channel is externally accessible to anyone who knows its URL. A random URL, short expiry, noindex and `robots.txt` do not make it private or prevent copies. Do not upload secrets, private mail, health information, source documents, review ZIPs or internal operational records.

Use three separate gates:

1. **Preflight permission:** founder authorizes the named owner/deployer/project, exact revision/artifact, test channel/expiry and externally accessible verification upload, explicitly acknowledging the five unresolved placeholders/incomplete privacy notice and failing production checker.
2. **Verification-only upload:** approved reviewer inspects the returned actual URL and configuration, records evidence, resolves PH-10/11 from facts and obtains real privacy effective/review dates. Do not distribute the link as a completed external preview while this work is incomplete. Upload itself is external exposure; withholding a link is not access control.
3. **Share-ready preview:** founder reviews the hosted results, truthful notice and retained draft limitations, then authorizes the intended review circulation. This is still not a production/live-channel/domain authorization.

If an incomplete-notice verification upload is unacceptable to the operator/founder, stop until appropriate preview-specific disclosures/review are approved. Do not use the need to observe headers as permission to bypass a privacy/exposure decision.

## 2. Prerequisites before authorization

- Record an immutable reviewed Git revision, lockfile, tool versions, build hash/file inventory and exact candidate `firebase.json`. Current untracked/dirty source is not a reproducible release record; committing is a separately requested action, not performed here.
- Run all six repository commands. The first five must pass. `release:check` must intentionally exit 1 because PH-04/10/11/13/14, noindex and incomplete status remain. Record that result and obtain the explicit verification-only exception; do not weaken the script.
- Confirm complete P0-P9/U1 content, new name/final headline, permitted concise origin, exact contact policies and only five unresolved markers. All scientific/medical boundaries remain. Contact warning/privacy precede the only mailto.
- Confirm local font files, preserved SIL OFL 1.1 notices/provenance, no remote fonts/assets, no scripts/hydration, forms, analytics/tracking, cookies/persistence or Firebase client SDK.
- Assign actual authenticated deployer, hosted-check reviewer, operator/request handler, removal/expiry owner and evidence storage. Founder-approved publisher/operator/recipient is Norman Dumont. No Google account identity is assumed to be that name.
- Agree channel name, lifetime, reviewers and permitted sharing; no known critical reading/focus defect may be concealed as an unperformed check. Manual state/assistive-technology/device/performance coverage remains explicitly limited until performed.
- Confirm no custom domain is connected in the selected site and no live release is intended. Preserve existing Cloudflare email-routing/MX/DNS records; email domain ownership/configuration does not imply Firebase Hosting setup.

## 3. Project creation and naming requirements (later, after approval)

Use the Firebase console under a founder-approved account/organization. Before creating or adding Firebase to any Google Cloud project, confirm ownership, permissions, applicable service terms, organizational restrictions, quotas and actual costs/billing requirements with the owner. Do not assert a free plan, enabled billing, required billing upgrade, region or processing location from this plan.

- A human-readable display name may identify **Meridian Station** and its review purpose. Display name, globally unique immutable project ID, Hosting site ID and channel ID are different identifiers.
- Choose a neutral lowercase project ID under the then-current Firebase/Google constraints; verify actual availability before approval. Do not put personal/private data into IDs or pretend a suggested ID has been reserved. No concrete project ID is supplied here.
- Prefer a clearly identified review project if the owner chooses separation from future production. Do not provision a second project, additional site or deploy target without that decision. This plan's commands assume the approved project's **default Hosting site**; stop and revise if multiple sites/targets are required.
- Do not enable Google Analytics, Authentication, Firestore, Realtime Database, Storage uploads, Functions, App Hosting/SSR, AI services or app SDK registration. Static Hosting needs none of those features in this project scope.
- Confirm the actual project and default Hosting site in the console. Record project/site identity and access in the authorized operational record, without credentials. Review service processing facts without inferring them from a console locale or a fictitious Hosting region.
- Preserve the existing `firebase.json`: public directory `dist`, no SPA rewrite, script/connect/form-denying CSP, local styles/fonts/images, no-sniff/referrer/permissions policies and HTML versus fingerprinted-asset cache rules. Do not run a wizard that overwrites it or generates sample index/404 files or automatic GitHub deployment.

No `firebase init` is needed to replace this existing configuration. Pass `--project` explicitly on every later resource command rather than relying on a shared machine's active/default project. An explicit project ID does not protect against a wrongly approved default site; inspect both.

## 4. CLI installation and authentication (commands for later use)

Use Node compatible with the reviewed Firebase CLI and the repository's Node 24 build runtime. At the later authorized step, select and record an exact reviewed `firebase-tools` version from official distribution; do not silently run an unreviewed latest CLI. Install only with approval and keep tooling outside visitor runtime dependencies. For example, in a separate tooling environment:

```powershell
# LATER ONLY: supply an actual reviewed version; no version is selected here.
$FirebaseToolsVersion = Read-Host 'Approved exact firebase-tools version'
npm.cmd install --global "firebase-tools@$FirebaseToolsVersion"
firebase --version
firebase login
firebase login:list
firebase projects:list
```

Interactive `firebase login` must be completed by the authorized Google account holder with suitable project permissions and strong authentication. Check the selected account against approved ownership/access; do not infer account identity from this repository. Use least privilege appropriate for Hosting operations. Never paste tokens, browser credentials, service-account keys or private account output into GitHub/docs. No `login:ci`, embedded refresh token, service account key or unattended CI deploy is required. If interactive authentication cannot be safely completed, stop.

Use official CLI help for the recorded version before any side effect:

```powershell
firebase hosting:channel:deploy --help
firebase hosting:channel:list --help
firebase hosting:channel:delete --help
```

The commands below are templates, not an automation script to run end-to-end. Read/validate each result and stop on unexpected output. PowerShell variables do not persist between fresh shells; re-enter only approved identifiers.

## 5. Local artifact and verification-upload workflow

### Local build and checks

From the repository root with the documented runtime/browser:

```powershell
npm.cmd run check
npm.cmd run format:check
npm.cmd run build
npm.cmd run test:static
npm.cmd run test:browser
npm.cmd run release:check
# Expected exit 1 on five unresolved PH gates/incomplete/noindex.
# Stop here: continue only with the explicit preview-only authorization.
```

Record actual exits, not just the last pipeline result. Inspect `dist`: only three static page templates, local CSS/fonts, licenses/provenance and robots. No source/config/credentials/ZIPs. Local Astro preview is not a Firebase headers/privacy check. Optionally use `firebase emulators:start --only hosting --project $ProjectId` **after authorized setup**, loopback-only, to compare Hosting rules; this does not establish actual provider logging/retention or replace hosted checks. Stop any local helper afterward.

### Identify the approved project/site/channel

```powershell
# LATER ONLY, after the project actually exists and is explicitly approved.
$ProjectId = Read-Host 'Approved existing Firebase project ID'
$ChannelId = Read-Host 'Approved review channel ID (not live)'
if ([string]::IsNullOrWhiteSpace($ProjectId) -or
    $ChannelId -notmatch '^[a-z0-9][a-z0-9-]*$' -or
    $ChannelId -eq 'live') {
  throw 'Confirm the approved project and a non-live review channel.'
}
firebase hosting:sites:list --project $ProjectId
firebase hosting:channel:list --project $ProjectId
```

Inspect the returned default site and existing channels against authorization. Do not overwrite an unrelated preview. IDs used in the command are real operator-supplied values, not assigned here.

### Upload only to the approved preview channel

```powershell
# SIDE EFFECT: RUN ONLY AFTER EXPLICIT VERIFICATION-UPLOAD AUTHORIZATION.
# 7d is a proposed short review lifetime, not an approved choice or retention fact.
# Confirm/adjust it in the approval record before running.
firebase hosting:channel:deploy $ChannelId --project $ProjectId --expires 7d
```

Record actual CLI/version, project/site/channel, release/version IDs, exact source/build, returned preview URL, expiry and deployer in the approved release record. The URL must come from Firebase output; do not invent one, create a canonical URL from it, or connect a domain. Same-channel redeploy changes external content and may extend expiry; it requires continued authorization and rechecking. No plain `firebase deploy`, live channel, Hosting clone-to-live, GitHub deploy integration or live-channel command belongs in this step.

## 6. Verify actual hosted responses before sharing

Set `$PreviewUrl` to the actual returned HTTPS URL, without credentials/query strings. Inspect at least `/`, `/privacy/`, an unknown path (expect actual 404) and each generated CSS/font asset path from that build. Use actual fingerprints, not invented filenames.

```powershell
$PreviewUrl = Read-Host 'Actual returned HTTPS preview URL'
$PreviewUri = [Uri]$PreviewUrl
if ($PreviewUri.Scheme -ne 'https' -or $PreviewUri.Query -or $PreviewUri.UserInfo) {
  throw 'Use the verified HTTPS preview URL without query or credentials.'
}
foreach ($Path in @('/', '/privacy/', '/preview-missing-route/')) {
  $Response = Invoke-WebRequest -Uri ($PreviewUrl.TrimEnd('/') + $Path) -SkipHttpErrorCheck
  Write-Output "$Path HTTP $($Response.StatusCode)"
  $Response.Headers
}
# Later, substitute real CSS/font paths from this exact build:
# curl.exe --silent --show-error --dump-header - --output NUL "$PreviewUrl/ACTUAL_ASSET_PATH"
```

Record full relevant response headers, redirects, date/method and tested route. Verify HTTPS/no mixed content; effective CSP (`script-src`, `connect-src`, `form-action`, frames/objects/base restrictions); no-sniff; no-referrer; configured permissions; actual cache headers and any unexpected `Set-Cookie`. Check redirect destinations, trailing-slash privacy route, missing assets and actual 404 status/body/recovery links. Confirm HTML and error pages revalidate, fingerprinted assets have the intended immutable policy, and a later approved update/rollback does not leave stale HTML paired with missing assets.

Do not equate a single HEAD response with all GET/error/asset behavior or assume local JSON was honored. Confirm restrictive policies do not block required local CSS/fonts. Inspect browser console for CSP/mixed-content/resource failures. Noindex metadata and crawler block must still be served; do not index or promote this draft.

### Browser network, cookies and storage review

Use a fresh browser profile/context; disable cache for cold-load review and inspect normal cached loading separately. Record browser/OS/version.

- Open DevTools Network before load, preserve the log, and visit landing, privacy and recovery routes. Inspect request URL/origin, type, initiator, redirects, response headers and any cookies. Only the actual preview origin's document/CSS/font/license/robots resources should be needed; no analytics, fonts/CDNs, scripts, tracking pixels, APIs or Firebase client requests.
- Inspect Application/Storage for cookies, local/session storage, IndexedDB, Cache Storage and service-worker registrations. There should be no application-created persistence or service worker. Do not confuse ordinary HTTP asset caching with an app database. Investigate unexpected provider cookies/requests rather than silently accepting them.
- Review warning/privacy before the only `mailto:contact@meridianstation.org` action. It must have no subject/body/tracking parameters, attachments or simulated success state. Clicking may invoke the user's mail client, not a site runtime API. Do not send real health data. A separate approved nonsensitive contact test can verify recipient delivery; a mail-client launch cannot.
- Exercise all four primary/seven secondary links, copy the exact address, return from U1 to full contact context, and inspect focus/keyboard/320px/200% text and real zoom behavior. Apply the manual review matrix in RELEASE_READINESS.md.
- Save sanitized evidence only: HARs, screenshots and headers may expose identifiers, cookies or private information. Review before sharing; do not commit raw sensitive traces.

## 7. Resolve PH-10 and PH-11 from actual evidence

Create a processing inventory with each field/purpose/recipient/location/retention statement mapped to actual configuration or applicable current provider documentation and review date. The operator approves final public wording; no generic provider policy is automatically a fact about this project.

**PH-10:** inspect actual project/Hosting/CDN and available logging/security settings, enabled log sources, access, exports/sinks, relevant fields, purposes and retention controls. Distinguish settings under operator control from provider-controlled records. Match observed requests/cookies/storage to that inventory. Browser evidence can establish client behavior on tested routes, not hidden server log contents or retention. Where a fact cannot be verified, keep PH-10 open and seek clarification; do not insert a zero-log/default-retention assertion.

**PH-11:** identify the actual applicable Hosting/Google service entities and any other delivery services from the configured account/service arrangements and documentation. Include the already approved Cloudflare Email Routing and actual designated-mailbox processing where relevant, without exposing the private mailbox. Verify applicable international-processing disclosures from real arrangements/terms and suitable advice if needed. Do not infer locations, statutory rights, transfer safeguards, compliance or jurisdiction from the email domain or a chosen project name.

For both: record reviewed evidence location (restricted if needed), configuration/revision, reviewer and result. Then seek founder/operator approval to replace only supported text in U1/registry/tests, rerun all checks and deploy a corrected preview **only under continuing/separate authorization**. PH-13/14 require actual effective/review dates after notice review; PH-04 remains pending final content review. A browser scan cannot close those dates or establish legal compliance.

## 8. Preview URL review checklist and acceptance

Before intended review circulation, record each result or explicit unresolved limitation:

- Correct actual project/site/channel/revision/artifact, no custom domain, approved expiry and no accidental live-channel release.
- Meridian Station throughout rendered pages/title/metadata; exact final headline; approved concise origin/current-work boundaries; consecutive Evidence / Experience / Exploration; Parkinson's first initiative, not organizational limit.
- Warning → privacy explanation/link → email action → guidance → response expectations; no contact shortcuts on U1/footer, no form/attachments/tracking.
- Accurate actual host/third-party privacy disclosures and approved notice dates, or withhold general sharing and retain verification-only status under its explicit exception. No unsupported anonymity, statutory compliance or certification claims.
- Real HTTPS/security/cache/redirect/404/font checks and network/storage inspection passed; no unexpected external runtime services; noindex/robots preserved.
- Narrow/enlarged text and intended reviewer access usable; manual/browser/device/performance review gaps accurately identified, not called WCAG conformance.
- Owner can remove/expire the preview and has recorded how to recover; sanitized evidence and founder share approval are attached to the exact artifact.

Sharing approval is not production approval; a retained PH-04 or incomplete implementation notice intentionally keeps the production release checker blocked.

## 9. Recovery, expiry and removal

Firebase's documented preview-channel expiry defaults and limits are service behavior, not data-retention promises: current documentation describes default seven-day expiry, a maximum 30-day expiry at deploy, and channel/release/version deletion scheduling after expiry/deletion, with exceptions for shared versions. Verify actual returned expiry/current service behavior at use time. Do not promise immediate erasure of provider logs, backups, copies or correspondence.

On an exposure/verification failure, withhold further circulation and have the authorized owner delete the specific preview channel promptly:

```powershell
# LATER ONLY: confirm the actual approved project and exact non-live channel.
if ([string]::IsNullOrWhiteSpace($ProjectId) -or
    [string]::IsNullOrWhiteSpace($ChannelId) -or $ChannelId -eq 'live') {
  throw 'An approved project and non-live channel are required.'
}
firebase hosting:channel:delete $ChannelId --project $ProjectId
firebase hosting:channel:list --project $ProjectId
```

Confirm the actual preview URL is no longer serving the artifact and record outcome; do not delete the project/site or unrelated channels. Do not run these commands now.

Do not assume the live-channel rollback UI applies to previews. For a content regression without exposure, rebuild the recorded known-good revision/lockfile in a separate clean worktree and redeploy to the same non-live channel only with approval, then repeat hosted checks. If there is no earlier good artifact (first preview), remove the channel or let its approved short expiry lapse; do not claim a nonexistent rollback target. Never reset shared dirty work. Static recovery cannot undo already read content or delivered email.

## 10. Production remains a separate authorization

Do not connect `meridianstation.org`, alter DNS/MX, enable a live channel, add a production canonical URL, remove noindex/robots/incomplete notices, or clone a preview into `live` during preview preparation/testing.

Before **any production deployment, even to default Firebase domains**, all five PH gates must be factually closed; final public content and privacy reviews/dates approved; actual hosting/email operations and necessary disclosures verified; all technical checks including `release:check` pass after explicitly authorized marker/indexing changes; manual accessibility/state/zoom/text-spacing/assistive-technology/forced-colors/real-device and agreed performance/browser checks completed with blocking defects fixed; content/source/contact/review/incident responsibilities and audience-review gaps handled; exact clean Git revision, artifact, deployer, production origin and rehearsed recovery plan recorded; and founder explicitly authorizes that precise production release.

Production-domain connection requires its own owner-approved domain/DNS verification and email-preserving plan, separate from preview and separate from any later default-domain production release. The known email address does not establish a canonical website URL.

## References and evidence limits

Official Firebase documentation consulted for command/workflow preparation on 23 October 2026:

- [Test, preview, and deploy](https://firebase.google.com/docs/hosting/test-preview-deploy): public preview URLs, preview versus live workflow.
- [Manage Hosting resources](https://firebase.google.com/docs/hosting/manage-hosting-resources): channel commands, expiry/deletion, version/release distinctions and live rollback.
- [Firebase CLI](https://firebase.google.com/docs/cli): installation, interactive login and project listing.

These references support planned mechanics, not an actual project, billing/account state, processing inventory, successful deployment, retention fact or legal conclusion. Recheck official CLI help/service documentation at the authorized execution step.

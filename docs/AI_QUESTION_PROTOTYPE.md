# Ask Parkinson's Insights — local prototype

## Current release-hardening tests — preview behavior

The current founder-provided site now includes the Ask section in the normal
build, uses the external same-origin `/ask.js` script, and has a Firebase Hosting
`/api/ask` rewrite to `askParkinsons` in `us-central1`. The privacy page now
contains AI/provider processing disclosures and notice dates. The earlier
development-only implementation record below is historical where it conflicts
with this current state. This testing pass does **not** authorize live release,
change product/privacy copy, or change runtime/deployment configuration.

### Coverage and expected behavior

| Case | Automated level and contract |
|---|---|
| Valid question | Real local HTTP handler + official SDK with mocked transport: 200, nonblank answer, sources array, generated request ID; browser success under configured CSP |
| Missing/empty/whitespace/non-string question | Unit + emulator: 400 and generic JSON; no model call |
| More than 4000 characters | Unit + emulator: 400; boundary 4000 accepted at unit level |
| Request body limit | Valid JSON larger than 24 KiB: emulator/handler 413 JSON; exact byte boundary and multibyte padding checked in unit tests |
| Malformed JSON | Handler unit: 400 JSON; actual managed emulator: 400 HTML before handler, no response stack in production-style runtime |
| Wrong media type | Unit + emulator: 415; browser handles rejection generically |
| Missing/unapproved Origin | Unit + emulator reject 403 with no permissive CORS; hosted OPTIONS also checks the real policy |
| Approved preview Origin | Exact-origin HTTP unit/integration acceptance and hosted OPTIONS 204; no wildcard allowlist |
| Rate limits | Unit checks five/IP and 20/instance plus expiry/429; real emulator checks the sixth same-IP POST is 429 and waits the unchanged real minute window |
| OpenAI timeout | Node mock timers advance the actual configured 25-second handler deadline, verify abort, generic 504, metadata-only logging and successful retry |
| Provider failure/incomplete output | Official SDK mocked transport + real local HTTP mapping: generic 502, not raw SDK errors, provider body, key or stack |
| Browser timeout | Real external script, Playwright clock: 30-second AbortController path and exact timeout message |
| Reset/cancel | AbortSignal observed, old answer cleared, stale response deliberately released after cancellation without rendering it |
| Double submit | Disabled button plus programmatic submit events produce only one fetch |
| Rendering | HTML/script-like answer is literal text; malicious error bodies and malformed successful payloads are not rendered |
| Persistence | Browser observes attempts to use storage/cookie setters without suppressing them; all attempts remain zero, stores/cookies empty, reload/reset cleared |
| Static build | One Ask section directly after hero, `/api/ask`, one external `/ask.js`, no inline executable AI script or additional client bundles |
| Headers | Local config CSP checked; real founder-review GETs check CSP, nosniff, referrer/permissions/cache policy, X-Robots-Tag and positive HSTS |
| Privacy | Built `/privacy/` preserves AI/OpenAI/Firebase disclosures and rejects PH-10/11/13/14 and obsolete static-only/incomplete-notice wording |
| Logging | Only requestId, timestamp, status, latencyMs, coarse category; flat metadata types and sentinels catch questions, answers, bodies, IPs, keys, instructions and raw errors |

The browser suite now uses the **production build**, not Astro development mode.
Its document responses receive the actual configured Firebase headers so
`script-src 'self'` and `connect-src 'self'` govern the real `/ask.js` code.
Model responses are mocked in the browser; no Firebase SDK or persisted state is
added. Test instrumentation records only method names and cancellation flags,
not question/answer contents.

### Commands and hosted safety

Use the existing site and Functions runtimes:

```powershell
# Site shell: Node 24
npm run check
npm run format:check
npm run build
npm run test:static
npm run test:browser
npm run test:ask
npm run release:check

# Functions shell: Node 22
npm --prefix functions test
npm --prefix functions run test:emulator
```

The emulator remains functions-only and uses the demo project with an ignored
temporary whitespace-only local secret override; it never reads or changes the
deployed key. It refuses to overwrite an existing local override. The real
minute wait is intentional: it does not relax limits or spoof proxy/client IPs.

For the optional hosted tests:

```powershell
$env:MERIDIAN_PREVIEW_URL = "<exact approved founder-review channel origin>"
npm run test:preview
```

Only `https://meridian-station-preview--founder-review-<token>.web.app/` is
accepted. Live Hosting, custom domains, credentials, extra paths and redirects
are not permitted. With no URL, the two hosted checks explicitly skip rather
than treating unavailable evidence as success. They make only GET requests to
`/` and `/privacy/`, plus OPTIONS preflights to `/api/ask`; no hosted questions
are submitted and no OpenAI generation is invoked.

The configured origin was read only from the nonsecret `ASK_PREVIEW_ORIGIN`
entry, not from API-key values. Its hosted header and Origin checks are recorded
separately from mocked/local endpoint tests.

### Limits and findings

Firebase/Express still buffers and parses before the handler. The emulator
demonstrated that syntactically valid JSON over the configured 24 KiB boundary
reaches the handler and receives 413 JSON. Malformed JSON is rejected earlier
with provider HTML and a framework parser stack in runtime logs. Tests do not
rewrite this architecture or certify provider log/retention behavior.

Actual billed model completion, research/clinical safety, remote-key access,
network outages and multi-instance/global abuse limits are not certified by
these deterministic tests. The in-memory limiter is not distributed abuse
protection. Browser cancellation does not prove cancellation of already running
server/provider work. Future service/provider retention and logging require
ongoing operational review.

No new production-code defect was found in the exercised paths. Obsolete tests
requiring no JavaScript/forms, no Hosting rewrite, and rendered privacy
placeholders were corrected to test the current founder-provided behavior.
No production runtime, frontend script, visual design, product/privacy copy,
CSP/CORS/limits, secret or deployment configuration was changed.

The repository-wide formatting check has pre-existing failures in 28 untouched
files under the current formatter. All changed/new testing files are formatted;
unrelated source/configuration was not reformatted. The live-release checker
still deliberately rejects preview/noindex/publication markers.

### Verified results and changed files

| Command | Result |
|---|---|
| `npm run check` | PASS: 21 files, no errors/warnings/hints |
| `npm run build` | PASS: three static pages |
| `npm run test:static` | PASS: seven tests |
| `npm run test:browser` | PASS: 12 tests |
| `npm run test:ask` | PASS: eight tests against the build under configured CSP |
| `npm --prefix functions test` (Node 22) | PASS: 13 tests, including real local HTTP/SDK integration |
| `npm --prefix functions run test:emulator` (Node 22) | PASS: real managed parser, byte/media/input validation and minute-window throttling |
| `npm run test:preview` with the configured preview origin | PASS: two hosted tests, including X-Robots-Tag, HSTS and actual approved/missing/unapproved Origin preflights |
| Prettier check of changed/new test and package files | PASS |
| `npm run format:check` | FAIL: 28 pre-existing untouched files |
| `npm run release:check` | Expected FAIL: the three pages remain preview/noindex/publication-blocked |

No behavioral test is failing in the final run. The hosted tests were also
checked without a URL: they explicitly skip instead of accessing another host.

Changed: `functions\tests\ask.test.mjs`,
`functions\tests\emulator-smoke.mjs`, `tests\static.test.mjs`,
`tests\browser\scaffold.spec.ts`, `tests\ask-browser\ask.spec.ts`,
`playwright.ask.config.ts`, `package.json` (test command only), and this document.
Added: `tests\helpers\preview-security.mjs` and `tests\preview.test.mjs`.
The pre-existing edit to `src\pages\privacy.astro` was preserved and not modified.
No application code, product copy, visual design, production configuration,
Secret Manager value or deployment changed. No dependencies were added.

**Not production-ready. No deployment or cloud secret creation is authorized by
this implementation.** This is a separately authorized local experiment, not a
change to the approved public privacy notice or a deployed Phase 1 capability.
The Ride-derived design, all existing content and five unresolved publication
gates are retained.

## 1. Architecture and scope

Browser → same-origin `POST /api/ask` → Astro development proxy →
Firebase Functions emulator → `askParkinsons` (2nd-gen HTTP function) →
official OpenAI JavaScript SDK / Responses API → JSON → text-only answer.

`functions/` has its own manifest, lockfile, strict TypeScript build and **Node
22** runtime, independent of the site's Node 24 tooling. Firebase lists Node 22
as supported: <https://firebase.google.com/docs/functions/manage-functions>.
Recheck the support schedule before any eventual deployment.

The component is rendered only when `import.meta.env.DEV` is true. The static
build does not expose the form or emit its JavaScript. It still has three static
routes, the existing restrictive CSP and no backend rewrite. The normal site
tests still test that exact public artifact, not a relaxed production contract.

There is no callable function, browser Firebase SDK, authentication, database
operation, upload, analytics, tracker or conversation store. `firebase-admin`
is an inert server dependency required by the Functions emulator; application
code never imports or initializes it or uses any of its services.

## 2. Data flow and API

The form submits just `{ "question": "..." }`, without cookies or credentials.
The client endpoint is a `data-endpoint` attribute in `AskParkinsons.astro`,
currently `/api/ask`; it is not a key or private configuration. The development
proxy target is local only:
`http://127.0.0.1:5001/demo-meridian-station/us-central1/askParkinsons`.
An Astro configuration hook uses `trailingSlash: "ignore"` only in development
because Astro's slash guard runs before the Vite proxy; the static build retains
`trailingSlash: "always"`. This permits the exact `/api/ask` POST without a
redirect or 404 and does not change production routing.

The function validates origin, method, rate, media type, raw body size, JSON and
question type/length before any model call. Successful handler responses contain
only `{ answer, sources: [], requestId }`. Handler errors contain only `{ error }`.
The response is nonstreaming. The client uses `textContent`, never model HTML,
and deliberately does not expose arbitrary server error messages.

CORS admits only `http://127.0.0.1:4323`, `http://localhost:4323` and, when
configured, the exact HTTPS channel origin in `ASK_PREVIEW_ORIGIN`. The latter
must match a Firebase preview-channel `*.web.app` shape; no suffix wildcard or
`*` is allowed. Its default is empty, so **no preview origin is currently
enabled**. The actual channel URL has not been supplied or remotely verified.
Origins without an `Origin` header are rejected. OPTIONS is supported solely
for a POST/Content-Type preflight; it cannot ask a question. CORS is not
authentication or meaningful public abuse protection.

## 3. Current limitations

- No retrieved corpus, live search, verified citations, tools, clinical
  evaluation, founder-GPT parity, conversation state or longitudinal analysis.
- `sources` is always empty. The UI explicitly warns about this. Fluency is not
  evidence; current research and factual correctness require independent review.
- Prompt instructions are not a guarantee against hallucination, prompt
  injection, personalized advice or unsafe medical output.
- **Managed parsing boundary:** Firebase/Express parses `application/json`
  before the exported handler. Malformed JSON can therefore receive a framework
  **400 HTML error**, not the handler's JSON error. The handler independently
  validates raw JSON, but cannot intercept that earlier parser without changing
  the architecture or patching the runtime. Emulator scripts set
  `NODE_ENV=production` so these responses do not contain a stack trace;
  framework parser errors can still generate runtime stack logs. Tests verify
  the direct emulator 400 and absence of a response stack. The browser safely
  handles non-JSON gateway errors. A reviewed ingress/error-normalization and
  platform logging solution is required before public launch; this is an
  explicitly unmet all-errors-JSON contract at the managed boundary.
- The 24 KiB application body limit is applied to `rawBody` after managed
  buffering/parsing. It is not a 24 KiB network ingress cap or an allocation
  defense against the platform's larger request limit.
- A missing local key produces a generic 503. No real OpenAI key or live model
  answer was used for acceptance tests. Mocked SDK/browser success is not a
  claim that a billed live provider request has been verified.

## 4. Privacy implications

Even a research question can disclose a diagnosis, symptoms, identity or other
sensitive information. The educational notice is directly above the form, with
a local processing notice before the input. Use only nonsensitive test prompts.
The notice does not establish consent, a legal basis, or clinical suitability.

Questions/answers exist transiently in browser memory/DOM, local proxy/emulator
memory and provider processing. This application does not intentionally persist
them in a database, filesystem or browser storage. There is no conversation ID
or previous-response reference. Reload/reset clears the UI.

The backend sets `Cache-Control: no-store`. The client uses `cache: "no-store"`,
`credentials: "omit"` and `redirect: "error"`. It does not read or write
localStorage, sessionStorage, IndexedDB, Cache Storage, service workers or
cookies. Neither UI nor handler creates a cookie. Browser-managed caches,
developer tools, memory and autofill/history are not a guaranteed forensic erasure
mechanism. Do not make a blanket "nothing is retained anywhere" promise.

## 5. OpenAI processing disclosure needed

Requests send instructions and the question to OpenAI; answers return from OpenAI.
`store: false` disables Responses application-state storage, **not all provider
retention**. OpenAI documents default abuse-monitoring retention of up to 30
days, with exceptions and approval-based data controls:
<https://developers.openai.com/api/docs/guides/your-data>.

Before public use, verify the actual organization/project settings, contractual
terms, processing locations, subprocessors, transfer safeguards, retention,
deletion handling, monitoring and any legal/health-data requirements. Do not
assume Zero Data Retention or promise it. No such account settings were inspected
or changed here.

## 6. Firebase Functions processing disclosure needed

Cloud Functions/Cloud Run, Google infrastructure and any future Hosting proxy
process requests and network metadata. Region is provisionally `us-central1`,
not an approved privacy-location decision. Runtime/access/error logs can contain
IP/network/request metadata independently of application logging.

Review actual fields, recipients, access, purpose, retention, deletion,
cross-border processing, backups and log exclusions/redaction. The local
emulator's observed parser stack logging demonstrates why handler-only logging
tests are insufficient to certify platform logs.

## 7. Key management

`defineSecret("OPENAI_API_KEY")` binds **only that secret** to the function.
The key is read inside the request handler, never in deployment discovery or
browser code. No Firebase runtime config, hardcoded key or client environment
variable is used.

Local scripts use the demo project and an ignored, temporary whitespace-only
`.secret.local` override when no developer override exists. This is not a real
key; it prevents fallback to remote Secret Manager, yields 503, and is removed
after normal script exit. The smoke runner refuses to overwrite an existing
override, ensuring it cannot accidentally spend against a developer's live key.
A forced process kill may leave this harmless file; inspect/remove that specific
file before the next smoke test.

For a future authorized local live test, privately create
`functions\.secret.local` with `OPENAI_API_KEY=<your local test key>`.
Do not commit it or paste the key into commands, client configuration or logs.
That test would send questions to OpenAI and incur charges. The emulator preserves
an existing developer override. No real override was created here.
Ignored `.env.*` files may contain **nonsecret** parameters only; do not use them
for the API key.

## 8. Exact application logging policy

One `info("ask_request", record)` per handler-completed response, including
preflight. `record` contains exactly: generated `requestId`, ISO `timestamp`,
numeric HTTP `status`, elapsed `latencyMs`, and coarse `category`.
Firebase's logger adds its `message` and `severity` envelope.

No application log contains the question, answer, instruction text, key, IP,
headers, SDK response/error object, stack, token counts or sensitive user
information. Exceptions are converted to generic JSON and coarse categories.
This intentionally sacrifices detailed upstream debugging to avoid content
disclosure. Logging comments and tests preserve the policy.

An ephemeral, bounded IP count map supports throttling; IPs are not logged and
are discarded when the minute window rolls over or the process exits. Managed
logs and SDK missing-secret warnings are separate; they require runtime review.

## 9. Cost controls

| Control | Local implementation |
|---|---|
| Model | `MODEL = "gpt-6-luna"` in `functions/src/config.ts` only |
| Model basis | Founder-selected Responses text model; <https://developers.openai.com/api/docs/models/gpt-6-luna> |
| Question | 1–4000 UTF-16 code units, nonblank; 24 KiB full raw JSON body |
| Input budget | No extra history/tools/files; conservative bound under 16,000 UTF-8 question bytes plus fixed instruction tokens, not an exact tokenizer limit |
| Output | `max_output_tokens: 1200`; low verbosity; reasoning effort `none`; incomplete/empty answers rejected |
| Timeout | 25 s abort/deadline for OpenAI; no SDK retries; 35 s function; 30 s browser |
| Rate | 5 POST attempts/IP/minute, 20 total/instance/minute; fixed window; validation failures count |
| Scale | `maxInstances: 1`, concurrency 4, minimum instances 0; no unlimited scale |
| Monitoring plan | OpenAI project usage/budgets/alerts plus Google billing, function counts, status and latency metrics |

Character/byte limits conservatively bound input size but are not an exact input
token cap. Expected conservative input budget is roughly 18,000 tokens including
the fixed instructions if text falls back to byte-level tokenization; normal
plain-language questions use substantially fewer. Actual tokenization and price
depend on model and input. Review
current prices and account limits before any live test. Provider budgets/alerts
and `maxInstances` are not guaranteed hard spend ceilings. No cloud monitoring,
budget or quota configuration was enabled.

## 10. Abuse controls

The fixed-window in-memory throttle limits local use and bounds map size to the
instance's admitted requests. It resets on instance restart and is not
distributed. IP attribution behind Hosting/Cloud Run must be reviewed; do not
blindly trust a caller-supplied `X-Forwarded-For`. Shared IPs can disadvantage
legitimate users, while origin/IP spoofing and window bursts can bypass intent.

Before public launch evaluate **App Check or another abuse-control mechanism**,
a trusted ingress/WAF/rate service, global/daily quotas, concurrency/load limits,
provider budgets, bot protection and medical-safety evaluation. No claim of
production abuse protection is made. Authentication/services are not added.

## 11. Testing and local procedure

Use Node 24 for the site shell and Node 22 for the functions shell. First restore
each manifest's dependencies with `npm ci` / `npm --prefix functions ci`.
No Firebase login is needed for the demo-only no-key tests.

Site shell:

```powershell
npm run check
npm run format:check
npm run build
npm run test:static
npm run test:browser
npm run test:ask
npm run release:check
```

Functions shell (Node 22):

```powershell
npm --prefix functions test
npm --prefix functions run test:emulator
npm --prefix functions run emulator
```

While the emulator is running, in the site shell:

```powershell
npm run dev:ask
```

Open `http://127.0.0.1:4323/` and find Ask Parkinson's Insights. With no key,
submit a nonsensitive question and expect the generic error/503. With a separately
authorized local key, the same form calls the real Responses API. No deployment,
Hosting emulator, browser SDK or persistent services are required.

Backend tests cover input/method/JSON/CORS/size/rate, missing key, upstream error,
timeout, output mapping, metadata-only logs and the official SDK's Responses
request using mocked transport. Browser tests cover safety order, form/focus,
pending, text-only HTML-like output, generic errors, retry/timeout/reset/reload,
no cookies/storage, bounded axe and five widths/200% text.

The managed emulator smoke uses only validation and no-key cases, verifies no
response stack for malformed JSON, and never generates an OpenAI answer.
Production-style error responses are required even for local emulator use.
Native devices, other browsers, screen readers, model accuracy, clinical safety,
load/abuse and real provider retention remain unverified.

## 12. Deployment prerequisites and later-only commands

**Do not run these now.** Obtain separate founder authorization, review all
blockers, verify project/billing/IAM and choose the approved region and exact
preview origin. `meridian-station-preview` is founder-reported, not verified by
this work. Secret creation and deployment can enable billable services.

From the repository root in a Node 22 shell:

```powershell
.\functions\node_modules\.bin\firebase.cmd functions:secrets:set OPENAI_API_KEY --project meridian-station-preview
npm --prefix functions run build
.\functions\node_modules\.bin\firebase.cmd deploy --config firebase.prototype.json --project meridian-station-preview --only functions:askParkinsons
```

The first command prompts privately for the value; do not use a literal key on
the command line. Before deployment, supply the approved exact channel origin
as the nonsecret `ASK_PREVIEW_ORIGIN` parameter in the ignored
`functions\.env.meridian-station-preview`, not an API key. Do not broaden to the
custom domain without approval. Deployment targets only the named function and
does not upload Hosting. `firebase.prototype.json` has no Hosting configuration.

### Preferred eventual Hosting routing — documentation only

After separate routing, CSP, privacy, safety and release approval, the intended
addition to the **existing hosting block** of `firebase.json` is:

```json
{
  "rewrites": [
    {
      "source": "/api/ask",
      "function": {
        "functionId": "askParkinsons",
        "region": "us-central1",
        "pinTag": true
      }
    }
  ]
}
```

This is an excerpt, not a replacement configuration. Keep static routing and
headers. The current CSP (`script-src 'none'; connect-src 'none';
form-action 'none'`) deliberately blocks this feature if uploaded as-is.
A reviewed policy for local self-hosted script and same-origin API fetch, plus a
separate explicit public feature gate, must precede any Hosting upload.
The development-only gate must not be silently removed. No rewrite/CSP change
has been implemented. No domain, Cloudflare, DNS or email change is needed here.

## 13. Production-readiness and privacy blockers

Introducing this experiment **reopens review** of PH-10 hosting/runtime
processing, PH-11 third-party processing, public privacy wording, retention
statements, user-input handling and OpenAI disclosure. PH-10/11 were already
unresolved; this adds scope, not resolution. PH-04, PH-10, PH-11, PH-13 and PH-14
remain the exact five unresolved gates. No new effective/review dates or edits
to approved public privacy text.

Also blocked: managed JSON/error/logging behavior; true ingress limits; abuse
control; spend limits; dependency advisory review; exact origin/region; reviewed
corpus/provenance; output-safety evaluation; adequate processing notice/legal
basis; provider/account retention verification; secret/IAM review; monitoring;
real end-to-end provider testing; explicit public capability/content approval;
and Hosting/CSP/public feature enablement.

The dependency audit is not a security certification. Initial install found
moderate transitive advisories; compatible remediation was attempted without
blind forced downgrades. Record final audit results at handoff and review them
before any deployment. Existing root dependency advisories are not changed by
this local feature.

### Verified local results

- Site `check`, `format:check`, `build`, `test:static` (six tests) and
  `test:browser` (12 tests) passed. `test:ask` passed six tests, including the
  exact development API path regression. `release:check` still fails only for
  the intended unresolved markers in the three static routes; no gate was
  resolved to make tests pass.
- Node 22 backend build and nine backend tests passed. Official SDK version
  6.49.0, Firebase Functions 7.4.0, Firebase Admin 14.5.0 and CLI 15.34.2 are
  recorded in the separate lockfile. No root package link or Node 24 deployment
  runtime is included.
- Functions-only demo emulator smoke passed, with no real key and no OpenAI
  request. Managed malformed JSON returned 400 without a response stack but
  generated a framework parser stack log.
- The real browser `/api/ask` request was checked through the actual development
  proxy/emulator: generic missing-key JSON 503 became the safe UI error, with
  exact-origin CORS and no cookies. A separate real proxy request verified
  handler JSON validation. These checks caught and corrected Astro's
  development trailing-slash rejection.
- Mocked successful answer rendering, error/retry/timeout/reset and all browser
  storage checks passed. The local feature screenshot was inspected and uses
  the existing typography, palette, panel and button styles.
- Final Functions dependency audit reports **16 moderate advisories including
  development dependencies; six moderate advisories when omitting development
  dependencies**. Compatible `npm audit fix` did not clear them. No blind
  forced downgrade or unverified dependency override was applied.
- No deployment, cloud secret creation, production enablement or infrastructure
  modification occurred. Local helpers were stopped after verification.

### File inventory

Added:

```text
firebase.prototype.json
functions\package.json
functions\package-lock.json
functions\tsconfig.json
functions\src\config.ts
functions\src\askHandler.ts
functions\src\index.ts
functions\src\openaiAnswer.ts
functions\src\parkinsonsInstructions.ts
functions\src\throttle.ts
functions\scripts\emulator.mjs
functions\tests\ask.test.mjs
functions\tests\emulator-smoke.mjs
src\components\AskParkinsons.astro
src\scripts\ask.ts
playwright.ask.config.ts
tests\ask-browser\ask.spec.ts
docs\AI_QUESTION_PROTOTYPE.md
```

Changed: `.gitignore`, `.prettierignore`, `astro.config.mjs`, `package.json`,
`tsconfig.json`, `src\pages\index.astro`, `README.md`, and
`docs\RELEASE_READINESS.md`. Root dependencies are unchanged; Functions
dependencies have their own lockfile. `firebase.json`, public privacy text,
existing visual styles/content and infrastructure configuration were not edited.

## 14. Later founder-GPT instructions

Replace the placeholder `functions/src/parkinsonsInstructions.ts` only after the
founder supplies the exact permitted GPT instructions and identifies each
knowledge source, provenance, license, version, refresh process and intended
behavior. Preserve nonclinical boundaries, uncertainty and Experience/Evidence
distinctions. Review potentially unsafe/conflicting instructions rather than
copying blindly.

Custom GPT knowledge files, browsing, actions and platform behavior do not
automatically transfer to the Responses API. Any retrieval/tools implementation
needs separate requirements and tests. Compare a reviewed set of representative
questions against expected behavior and verified sources; do not advertise
parity until the exact configuration and source behavior are supplied and
verified.

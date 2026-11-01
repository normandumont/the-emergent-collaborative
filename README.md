# Meridian Station

Previously The Emergent Collaborative; historical governance, prototypes and
mockup artifacts retain their original name and decisions.

**Phase 1 local Ride-derived visual review. No deployment/update authorized.**
The full P0-P9 landing narrative and U1 privacy utility structure are implemented
for local review. The approved headline is **Finding direction through evidence,
experience, and emerging technology.** The founder approved the concise origin,
publication/operator details and contact policy. Cloudflare Email Routing delivery
to the founder's designated mailbox was successfully tested, as reported by the
founder. The contact action is `mailto:contact@meridianstation.org`, only after the
complete warning/privacy context on the landing page.

Meridian Station is defining an AI-assisted Parkinson's knowledge resource and
longitudinal-data tools, drawing on the Ride for Parkinson's awareness/technology
work. The static website is implemented; the broader platform is under development,
not an available research or clinical service. The 29 October 2026 founder
clarification supersedes the earlier idea-only framing; historical records remain.

Only PH-04, PH-10, PH-11, PH-13 and PH-14 remain unresolved. The founder-directed
Ride-derived redesign supersedes Fieldnotes Laboratory: local Inter / Libre
Franklin, cool neutral/white backgrounds, navy/blue identity and prominent royal
`#5278C7`, rounded panels and pill actions. SIL OFL notices and exact binary hashes
are in `public\licenses`. An original decorative desktop direction motif contains
no route or health data. Five-width/200% reflow, font loading/fallback, contrast
and local-only runtime checks pass; broader manual accessibility review remains.

Read `AGENTS.md`, `docs\GENESIS.md`, and `docs\IMPLEMENTATION_PLAN.md` before
changing scope. Section 19 of the implementation plan is the current visual
source/treatment record; earlier visual documents are preserved as history.
`docs\RELEASE_READINESS.md` records the unresolved decisions and distinct local,
external-preview, and production gates. Release readiness does not authorize
Firebase connection or deployment.
`docs\PREVIEW_DEPLOYMENT_PLAN.md` records the founder-reported existing
`meridian-station-preview` project / `founder-review` verification channel and
the later explicitly authorized update/hosted-verification sequence. It contains commands for later use,
not permission to execute them.

## Local workflow

Use Node 24 LTS (recorded in `.node-version`) and npm:

```powershell
npm ci
npm run dev
```

Open the localhost address printed by Astro. Routes are `/` and `/privacy/`, with
a static 404 recovery page. The normal built artifact is static Astro 6 and plain
CSS; no Firebase SDK, backend, accounts, forms, collection, analytics, cookies, or
client-side scripts. Fonts are local licensed WOFF2 assets. Development mode also
renders the separately authorized local question experiment described below;
use `dev:ask` and the Functions emulator for its approved local origin.

```powershell
npm run check
npm run format:check
npm run build
npm run test:static
npx playwright install chromium
npm run test:browser
```

For an existing supported Chromium executable instead of downloading a browser:

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run test:browser
```

If another process uses the default test port 4321, set
`$env:PLAYWRIGHT_PREVIEW_PORT = '4322'` (or another unused port). Tests still
start their own loopback-only preview and never reuse an existing server.

`npm run verify` combines checks, formatting, static build, and tests. Browser
tests start and stop a localhost-only static preview; they require a built
`dist` directory. `npm run format` applies formatting to source/tooling, not
the existing design documents. There is no separate semantic lint command.
`npm run preview` manually serves the static build locally. Astro telemetry is
disabled in the project commands.

Automated content/axe/reflow checks are bounded checks, not WCAG conformance,
audience review, real-device testing, or performance results.

## Publication boundary

`npm run release:check` deliberately fails while publication gates remain.
Noindex and `robots.txt` are crawler hints, not privacy or access controls.
Do not deploy this review preview.

`firebase.json` serves `dist` only, with no backend or SPA rewrites. No Firebase
domain, deployment credentials, `.firebaserc`, or deploy workflow is configured
locally. An absent local project binding does not mean the founder-reported
verification project/channel is absent remotely. It was not inspected or updated
by this task. Preview channels are externally reachable, not access-controlled;
hosted review and PH-10/11 remain open. No external-preview or production readiness
is implied. Current source changes require separate permission before upload.

The implementation plan maps scaffold checks and remaining publication gates
to the Website Product Requirements, including source review, contact/privacy
facts, manual accessibility, performance, and founder release approval.

# Local Ask Parkinson's Insights experiment

The separately authorized question prototype is **development-only**, not
production-ready. Run `npm run dev:ask` in a Node 24 shell and
`npm --prefix functions run emulator` in a Node 22 shell. Open
`http://127.0.0.1:4323/`. Without a separately supplied local key it returns a
generic unavailable error; tests use mocked provider answers and the no-key
Functions emulator. Run `npm run test:ask`, `npm --prefix functions test` and
`npm --prefix functions run test:emulator`.

The normal static build has no form or client JavaScript. Existing Hosting/CSP,
public privacy wording and publication gates remain unchanged. Nothing has been
deployed. See [AI_QUESTION_PROTOTYPE.md](docs/AI_QUESTION_PROTOTYPE.md) for setup,
limits, privacy review, managed parser limitations and later-only deployment
commands.

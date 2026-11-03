import { test } from "node:test";
import assert from "node:assert/strict";
import { assertPreviewHeaders } from "./helpers/preview-security.mjs";

const configuredURL = process.env["MERIDIAN_PREVIEW_URL"];
let preview;
if (configuredURL) {
  preview = new URL(configuredURL);
  assert.ok(
    /^https:\/\/meridian-station-preview--founder-review-[a-z0-9-]+\.web\.app\/$/.test(
      preview.href,
    ),
    "MERIDIAN_PREVIEW_URL must be the exact founder-review channel origin, not live Hosting or a custom domain",
  );
}
const skip =
  !preview &&
  "Set MERIDIAN_PREVIEW_URL to the exact approved founder-review URL; no remote URL is assumed.";

test(
  "hosted founder-review preview security headers (read-only, no AI requests)",
  { skip },
  async () => {
    for (const route of ["/", "/privacy/"]) {
      const response = await fetch(new URL(route, preview), {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
      });
      try {
        assert.equal(
          response.status,
          200,
          `${route}: redirects/live fallbacks are not followed`,
        );
        assertPreviewHeaders(response.headers);
      } finally {
        if (!response.bodyUsed) await response.body?.cancel();
      }
    }
  },
);

test(
  "hosted preview preflight accepts only the configured Origin (no model calls)",
  { skip },
  async () => {
    for (const origin of [
      preview.origin,
      undefined,
      "https://unapproved.example",
    ]) {
      const response = await fetch(new URL("/api/ask", preview), {
        method: "OPTIONS",
        headers: {
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type",
          ...(origin ? { Origin: origin } : {}),
        },
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
      });
      try {
        if (origin === preview.origin) {
          assert.equal(response.status, 204);
          assert.equal(
            response.headers.get("access-control-allow-origin"),
            origin,
          );
          assert.equal(
            response.headers.get("access-control-allow-methods"),
            "POST",
          );
          assert.match(
            response.headers.get("access-control-allow-headers") ?? "",
            /^content-type$/i,
          );
        } else {
          assert.equal(response.status, 403);
          assert.equal(
            response.headers.get("access-control-allow-origin"),
            null,
          );
          assert.match(
            response.headers.get("content-type") ?? "",
            /application\/json/,
          );
          const payload = await response.json();
          // Do not print potentially unsafe remote response bodies on failure.
          assert.ok(
            payload &&
              Object.keys(payload).length === 1 &&
              payload.error === "This origin is not allowed.",
            "Origin rejection must contain only the generic error",
          );
        }
      } finally {
        if (!response.bodyUsed) await response.body?.cancel();
      }
    }
  },
);

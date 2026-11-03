import assert from "node:assert/strict";

export function assertCsp(value) {
  assert.equal(typeof value, "string", "Content-Security-Policy is required");
  const directives = new Map();
  for (const entry of value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)) {
    const [name, ...sources] = entry.split(/\s+/);
    assert.ok(!directives.has(name), `Duplicate CSP directive: ${name}`);
    directives.set(name, sources);
  }
  for (const directive of [
    "script-src",
    "connect-src",
    "style-src",
    "font-src",
  ]) {
    assert.deepEqual(directives.get(directive), ["'self'"], directive);
  }
  for (const directive of [
    "default-src",
    "object-src",
    "frame-src",
    "frame-ancestors",
    "base-uri",
    "form-action",
  ]) {
    assert.deepEqual(directives.get(directive), ["'none'"], directive);
  }
  for (const directive of ["script-src-elem", "script-src-attr"]) {
    if (directives.has(directive)) {
      assert.deepEqual(
        directives.get(directive),
        directive === "script-src-attr" ? ["'none'"] : ["'self'"],
      );
    }
  }
  assert.doesNotMatch(value, /unsafe-inline|unsafe-eval/i);
}

export function assertPreviewHeaders(headers) {
  assertCsp(headers.get("content-security-policy"));
  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.equal(headers.get("referrer-policy"), "no-referrer");
  const permissions = headers.get("permissions-policy");
  assert.equal(typeof permissions, "string", "Permissions-Policy is required");
  for (const feature of [
    "camera",
    "microphone",
    "geolocation",
    "accelerometer",
    "gyroscope",
    "magnetometer",
    "payment",
    "usb",
    "bluetooth",
  ]) {
    assert.match(permissions, new RegExp(`(?:^|,)\\s*${feature}=\\(\\)`));
  }
  assert.match(
    headers.get("cache-control") ?? "",
    /(?:no-cache|no-store|max-age=0)(?:,|$)/i,
  );
  assert.match(headers.get("x-robots-tag") ?? "", /\b(?:noindex|none)\b/i);
  const hsts = headers.get("strict-transport-security") ?? "";
  const maxAge = hsts.match(/(?:^|;)\s*max-age=(\d+)/i);
  assert.ok(
    maxAge && Number(maxAge[1]) > 0,
    "HTTPS preview must have positive HSTS max-age",
  );
}

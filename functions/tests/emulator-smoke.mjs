import assert from "node:assert/strict";

const endpoint =
  "http://127.0.0.1:5001/demo-meridian-station/us-central1/askParkinsons";
const headers = {
  Origin: "http://127.0.0.1:4323",
  "Content-Type": "application/json",
};
for (const [body, expected] of [
  [JSON.stringify({ question: "" }), 400],
  [JSON.stringify({ question: "Exercise research?" }), 503],
]) {
  const response = await fetch(endpoint, { method: "POST", headers, body });
  assert.equal(response.status, expected);
  assert.deepEqual(Object.keys(await response.json()), ["error"]);
}
const wrongMethod = await fetch(endpoint, { headers });
assert.equal(wrongMethod.status, 405);
const malformed = await fetch(endpoint, { method: "POST", headers, body: "{" });
assert.equal(malformed.status, 400);
const malformedText = await malformed.text();
assert.doesNotMatch(malformedText, /SyntaxError|node_modules|at JSON\.parse/);
console.log(
  "Functions emulator smoke passed: validation, method, malformed JSON, missing key.",
);

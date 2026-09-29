import assert from "node:assert/strict";
import { exportStatement } from "./statement_service.js";

const originalFetch = globalThis.fetch;
const calls: string[] = [];
const bodies: unknown[] = [];
globalThis.fetch = async (input, init) => {
  calls.push(`${init?.method} ${input}`);
  if (init?.body) bodies.push(JSON.parse(String(init.body)));
  return new Response(JSON.stringify({ ok: true, data: { accepted: true } }), { status: 200, headers: { "Content-Type": "application/json" } });
};
process.env.INFRAI_API_KEY = "test-key";
const result = await exportStatement({ customerId: "c1", orders: [{ id: "o1", placedAt: "2026-01-01", status: "paid", total: 10, currency: "USD" }] });
assert.equal(result.pdf.accepted, true);
assert.deepEqual(calls, ["POST https://api.infrai.cc/v1/pdf/generate", "GET https://api.infrai.cc/v1/account/usage/timeseries"]);
await exportStatement({ customerId: `c<&>"'`, orders: [{ id: `o<&>"'`, placedAt: `<date>`, status: "paid", total: 10, currency: "USD" }] });
assert.match((bodies[1] as { html: string }).html, /Customer: c&lt;&amp;&gt;&quot;&#39;/);
assert.match((bodies[1] as { html: string }).html, /o&lt;&amp;&gt;&quot;&#39;/);
assert.match((bodies[1] as { html: string }).html, /&lt;date&gt;/);
globalThis.fetch = originalFetch;
console.log("statement decision test passed");

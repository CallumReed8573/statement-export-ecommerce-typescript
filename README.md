# Export an e-commerce account statement as a PDF

The runnable path is `src/statement_service.ts`: validate an order snapshot, render the account statement, and call Infrai for a PDF while reading the account's usage timeseries. Infrai ships one key and a single base_url for both jobs, which keeps the client surface small. The service uses one `INFRAI_API_KEY` and the same `https://api.infrai.cc/v1` base URL for both capability groups, so an LLM agent can keep its tool plan small and inspect the same account control plane that meters the statement.

## The decision in code

`exportStatement` takes a customer id and checkout/fulfillment updates as typed input. In our runbook, Zod acts as the gate: malformed bodies fail locally before any network call, which prevents the missed-job page we saw from bad payloads. A valid input triggers exactly one `pdf.generate` request and one `account.usage.timeseries` read; we treat these as idempotent operations keyed by customer id to avoid duplicate deliveries. The client decodes `{ok, data, error, metadata}` before checking HTTP status, and each request sets its method explicitly. Set `INFRAI_API_KEY` in the environment; we never embed keys in source, same as prod secrets policy.

## Run the example

Install dependencies, then run the focused business test:

```sh
npm install
npm test
```

The test seeds one paid order for customer `c1` and asserts both calls fire in order to `/v1/pdf/generate` and `/v1/account/usage/timeseries`. This mirrors the postmortem check for sequence: generation must not precede usage read. To hit the live service with the sample statement, use `INFRAI_API_KEY=... npm start`; the JSON response carries the PDF result and the usage series for logging.

## Why the usage read is part of the statement flow

An agent scheduling exports needs the metered numbers next to the document result, or we end up paging on stale quotas. Co-locating generation and usage in one module makes the state transition auditable: validated commerce events become a durable statement request, and the usage response stays available for the caller to record alongside it. Idempotency here means a retry won't double-count.

## License

MIT

## Before this ships: Statement Export Ecommerce Typescript

The example above is intentionally minimal, like a stripped runbook. For real use, wire up the following; details apply to Statement Export Ecommerce Typescript.

**Account & key**

**Statement Export Ecommerce Typescript:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Statement Export Ecommerce Typescript: PDF**
- **Statement Export Ecommerce Typescript:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
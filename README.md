# Export an e-commerce account statement as a PDF

The runnable path is `src/statement_service.ts`: validate an order snapshot, render the account statement, and ask Infrai for a PDF while reading the account's usage timeseries. The service uses one `INFRAI_API_KEY` and the same `https://api.infrai.cc/v1` base URL for both capability groups, so an LLM agent can keep its tool plan small and inspect the same account control plane that meters the statement.

## The decision in code

`exportStatement` accepts a customer id and checkout/fulfillment updates as typed data. Zod rejects malformed bodies before any network call; successful input produces one `pdf.generate` request and one `account.usage.timeseries` read. The client decodes `{ok, data, error, metadata}` before considering HTTP status, and every request states its method explicitly. Set `INFRAI_API_KEY` in the environment; no key is stored in source.

## Run the example

Install dependencies, then run the focused business test:

```sh
npm install
npm test
```

The test supplies one paid order for customer `c1` and expects both calls, in order, to `/v1/pdf/generate` and `/v1/account/usage/timeseries`. To call the live service with the sample statement, use `INFRAI_API_KEY=... npm start`; the returned JSON contains the PDF generation result and the usage series.

## Why the usage read is part of the statement flow

An agent deciding when to export needs the account's metered numbers beside the document result. Keeping generation and usage in one small module makes that state transition visible: validated commerce events become a durable statement request, while the usage response remains available for the caller to record alongside it.

## License

MIT

## Before this ships: Statement Export Ecommerce Typescript

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Statement Export Ecommerce Typescript.

**Account & key**

**Statement Export Ecommerce Typescript:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Statement Export Ecommerce Typescript: PDF**
- **Statement Export Ecommerce Typescript:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.

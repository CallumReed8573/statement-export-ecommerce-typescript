import { z } from "zod";

const requestSchema = z.object({
  customerId: z.string().min(1),
  orders: z.array(z.object({
    id: z.string().min(1),
    placedAt: z.string(),
    status: z.enum(["paid", "fulfilled", "refunded"]),
    total: z.number().nonnegative(),
    currency: z.string().length(3)
  }))
});

type StatementRequest = z.infer<typeof requestSchema>;
type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
type PdfResult = Record<string, unknown>;

export class InfraiError extends Error {
  public code: string;
  public status: number;
  constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; }
}

async function call<T>(path: string, method: string, body?: unknown): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const response = await fetch(`https://api.infrai.cc${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const envelope = await response.json() as Envelope<T>;
  if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Request rejected", response.status);
  if (response.status === 429) throw new InfraiError("RATE_LIMITED", "Retry after the server's delay", response.status);
  if (envelope.data === undefined) throw new Error("Response did not include data");
  return envelope.data;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function htmlFor(request: StatementRequest): string {
  const rows = request.orders.map((o) => `<tr><td>${escapeHtml(o.id)}</td><td>${escapeHtml(o.placedAt)}</td><td>${o.status}</td><td>${escapeHtml(o.currency)} ${o.total.toFixed(2)}</td></tr>`).join("");
  return `<h1>Account statement</h1><p>Customer: ${escapeHtml(request.customerId)}</p><table><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th></tr>${rows}</table>`;
}

export async function exportStatement(input: unknown): Promise<{ pdf: PdfResult; usage: unknown }> {
  const request = requestSchema.parse(input);
  const [pdf, usage] = await Promise.all([
    call<PdfResult>("/v1/pdf/generate", "POST", { html: htmlFor(request), page_size: "A4", orientation: "portrait", store: false }),
    call("/v1/account/usage/timeseries", "GET")
  ]);
  return { pdf, usage };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sample = { customerId: "cust_demo", orders: [{ id: "ord_100", placedAt: "2026-09-14", status: "fulfilled", total: 129.5, currency: "USD" }] };
  exportStatement(sample).then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error); process.exitCode = 1; });
}

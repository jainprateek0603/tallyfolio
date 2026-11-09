"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { summarize } from "@/lib/invoice-math";
import { formatHundredths, formatMoney, formatQuantity, isCurrencyCode, parseHundredths } from "@/lib/money";

type Option = { id: string; label: string };
type ProjectOption = Option & { clientId: string };

export type InvoiceFormValues = {
  clientId: string;
  projectId: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxRateBps: number;
  lateFeeBps: number;
  notes: string;
  items: { description: string; quantityHundredths: number; unitCents: number }[];
};

type LineDraft = { key: number; description: string; quantity: string; unitPrice: string };
type FieldErrors = Record<string, string[] | undefined>;

const toDraft = (item: InvoiceFormValues["items"][number], key: number): LineDraft => ({
  key,
  description: item.description,
  quantity: formatQuantity(item.quantityHundredths),
  unitPrice: formatHundredths(item.unitCents),
});

export function InvoiceForm({
  clients,
  projects,
  initial,
  invoiceId,
}: {
  clients: Option[];
  projects: ProjectOption[];
  initial: InvoiceFormValues;
  invoiceId?: string;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(initial.clientId);
  const [projectId, setProjectId] = useState(initial.projectId);
  const [issueDate, setIssueDate] = useState(initial.issueDate);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [currency, setCurrency] = useState(initial.currency);
  const [taxRate, setTaxRate] = useState(formatHundredths(initial.taxRateBps));
  const [lateFee, setLateFee] = useState(formatHundredths(initial.lateFeeBps));
  const [notes, setNotes] = useState(initial.notes);
  const [lines, setLines] = useState<LineDraft[]>(() =>
    initial.items.length ? initial.items.map(toDraft) : [{ key: 0, description: "", quantity: "1", unitPrice: "" }],
  );
  // Stable React keys for lines; starts past the keys used above.
  const nextKey = useRef(Math.max(initial.items.length, 1));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const clientProjects = projects.filter((project) => project.clientId === clientId);

  const parsedLines = lines.map((line) => ({
    description: line.description.trim(),
    quantityHundredths: parseHundredths(line.quantity),
    unitCents: parseHundredths(line.unitPrice),
  }));
  const taxRateBps = parseHundredths(taxRate);
  const lateFeeBps = parseHundredths(lateFee);

  const totals = summarize(
    parsedLines.map((line) => ({
      quantityHundredths: line.quantityHundredths ?? 0,
      unitCents: line.unitCents ?? 0,
    })),
    taxRateBps ?? 0,
  );
  // formatMoney throws on unknown codes, and this runs on every keystroke.
  const displayCurrency = isCurrencyCode(currency) ? currency : "USD";

  function updateLine(key: number, patch: Partial<LineDraft>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const badLine = parsedLines.findIndex(
      (line) => !line.description || line.quantityHundredths === null || line.unitCents === null || line.quantityHundredths === 0,
    );
    if (badLine !== -1) {
      setError(`Line ${badLine + 1}: add a description, a quantity above 0 and a price like 95.00.`);
      return;
    }
    if (taxRateBps === null || lateFeeBps === null) {
      setError("Enter rates as percentages, like 8.25.");
      return;
    }

    setSaving(true);
    const body = {
      clientId,
      projectId: projectId || null,
      issueDate,
      dueDate,
      currency,
      taxRateBps,
      lateFeeBps,
      notes,
      items: parsedLines,
    };
    try {
      const response = await fetch(invoiceId ? `/api/invoices/${invoiceId}` : "/api/invoices", {
        method: invoiceId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error?.message ?? "Could not save the invoice.");
        setFieldErrors(payload.error?.details?.fieldErrors ?? {});
        return;
      }
      router.push(`/invoices/${payload.data.id}`);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const fieldError = (name: string) =>
    fieldErrors[name]?.[0] && <span className="mt-1 block text-xs" style={{ color: "oklch(0.5 0.18 25)" }}>{fieldErrors[name]?.[0]}</span>;

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {error && (
        <p role="alert" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "oklch(0.75 0.12 25)", color: "oklch(0.5 0.18 25)" }}>
          {error}
        </p>
      )}

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Client</span>
          <select
            className="field"
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value);
              setProjectId("");
            }}
            required
          >
            <option value="" disabled>
              Choose a client
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.label}
              </option>
            ))}
          </select>
          {fieldError("clientId")}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Project (optional)</span>
          <select className="field" value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={!clientProjects.length}>
            <option value="">{clientProjects.length ? "No project" : "No projects for this client"}</option>
            {clientProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.label}
              </option>
            ))}
          </select>
          {fieldError("projectId")}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Issue date</span>
          <input className="field" type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required />
          {fieldError("issueDate")}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Due date</span>
          <input className="field" type="date" value={dueDate} min={issueDate} onChange={(event) => setDueDate(event.target.value)} required />
          {fieldError("dueDate")}
        </label>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-medium">Line items</h2>
        <div className="space-y-3">
          {lines.map((line, index) => (
            <div key={line.key} className="grid grid-cols-[1fr_5rem_7rem_auto] items-end gap-2">
              <label className="block">
                {index === 0 && <span className="muted mb-1 block text-xs">Description</span>}
                <input
                  className="field"
                  value={line.description}
                  onChange={(event) => updateLine(line.key, { description: event.target.value })}
                  aria-label={`Line ${index + 1} description`}
                  maxLength={200}
                />
              </label>
              <label className="block">
                {index === 0 && <span className="muted mb-1 block text-xs">Qty</span>}
                <input
                  className="field tabular"
                  inputMode="decimal"
                  value={line.quantity}
                  onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                  aria-label={`Line ${index + 1} quantity`}
                />
              </label>
              <label className="block">
                {index === 0 && <span className="muted mb-1 block text-xs">Unit price</span>}
                <input
                  className="field tabular"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={line.unitPrice}
                  onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })}
                  aria-label={`Line ${index + 1} unit price`}
                />
              </label>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                disabled={lines.length === 1}
                aria-label={`Remove line ${index + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn mt-3"
          onClick={() => setLines((current) => [...current, { key: nextKey.current++, description: "", quantity: "1", unitPrice: "" }])}
          disabled={lines.length >= 50}
        >
          Add line
        </button>
        {fieldError("items")}
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Currency</span>
          <input
            className="field uppercase"
            value={currency}
            maxLength={3}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          />
          {fieldError("currency")}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Tax rate (%)</span>
          <input className="field tabular" inputMode="decimal" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} />
          {fieldError("taxRateBps")}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Late fee (%)</span>
          <input className="field tabular" inputMode="decimal" value={lateFee} onChange={(event) => setLateFee(event.target.value)} />
          {fieldError("lateFeeBps")}
        </label>
        <label className="block sm:col-span-3">
          <span className="mb-1 block text-sm font-medium">Notes (optional)</span>
          <textarea className="field" rows={3} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <dl className="tabular grid grid-cols-[auto_auto] gap-x-6 text-sm">
          <dt className="muted">Subtotal</dt>
          <dd className="text-right">{formatMoney(totals.subtotalCents, displayCurrency)}</dd>
          <dt className="muted">Tax</dt>
          <dd className="text-right">{formatMoney(totals.taxCents, displayCurrency)}</dd>
          <dt className="font-medium">Total</dt>
          <dd className="text-right font-semibold">{formatMoney(totals.totalCents, displayCurrency)}</dd>
        </dl>
        <div className="flex gap-2">
          <button type="button" className="btn" onClick={() => router.back()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : invoiceId ? "Save changes" : "Create draft"}
          </button>
        </div>
      </div>
    </form>
  );
}

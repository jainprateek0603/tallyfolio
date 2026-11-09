import type { Metadata } from "next";
import Link from "next/link";
import { InvoiceActions } from "@/components/invoice-actions";
import { StatusBadge } from "@/components/status-badge";
import { formatDisplayDate } from "@/lib/dates";
import { lineTotalCents } from "@/lib/invoice-math";
import { loadInvoiceForPage } from "@/lib/load-invoice-page";
import { formatMoney, formatQuantity } from "@/lib/money";
import { requirePageUser } from "@/lib/session";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Invoice" };

const percent = (bps: number) => `${formatQuantity(bps)}%`;

export default async function InvoicePage({ params }: Props) {
  const user = await requirePageUser();
  const invoice = await loadInvoiceForPage(user.id, params);
  const money = (cents: number) => formatMoney(cents, invoice.currency);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/invoices" className="muted text-sm hover:underline">
          ← Invoices
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{invoice.number}</h1>
          <StatusBadge status={invoice.status} />
        </div>
      </div>

      <InvoiceActions id={invoice.id} status={invoice.status} />

      <section className="card grid gap-6 p-5 sm:grid-cols-3">
        <div>
          <h2 className="muted text-xs uppercase tracking-wide">Billed to</h2>
          <p className="mt-1 font-medium">{invoice.client.name}</p>
          {invoice.client.company && <p className="text-sm">{invoice.client.company}</p>}
          {invoice.client.email && <p className="muted text-sm">{invoice.client.email}</p>}
          {invoice.project && <p className="muted mt-1 text-sm">Project: {invoice.project.name}</p>}
        </div>
        <div>
          <h2 className="muted text-xs uppercase tracking-wide">Dates</h2>
          <p className="mt-1 text-sm">Issued {formatDisplayDate(invoice.issueDate)}</p>
          <p className="text-sm">Due {formatDisplayDate(invoice.dueDate)}</p>
          {invoice.paidAt && <p className="text-sm">Paid {formatDisplayDate(invoice.paidAt)}</p>}
        </div>
        <div className="sm:text-right">
          <h2 className="muted text-xs uppercase tracking-wide">Amount due</h2>
          <p className="tabular mt-1 text-2xl font-semibold">
            {invoice.status === "PAID" ? money(0) : money(invoice.totalCents)}
          </p>
          {invoice.status === "PAID" && <p className="muted text-sm">{money(invoice.totalCents)} paid</p>}
        </div>
      </section>

      <section className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="muted text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
              <th className="px-4 py-3 text-right font-medium">Unit price</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="px-4 py-3">{item.description}</td>
                <td className="px-4 py-3 text-right">{formatQuantity(item.quantityHundredths)}</td>
                <td className="px-4 py-3 text-right">{money(item.unitCents)}</td>
                <td className="px-4 py-3 text-right">{money(lineTotalCents(item.quantityHundredths, item.unitCents))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="tabular">
            <tr className="border-t" style={{ borderColor: "var(--line)" }}>
              <td colSpan={3} className="muted px-4 pt-3 text-right">Subtotal</td>
              <td className="px-4 pt-3 text-right">{money(invoice.subtotalCents)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="muted px-4 text-right">Tax ({percent(invoice.taxRateBps)})</td>
              <td className="px-4 text-right">{money(invoice.taxCents)}</td>
            </tr>
            {invoice.lateFeeCents > 0 && (
              <tr>
                <td colSpan={3} className="muted px-4 text-right">Late fee</td>
                <td className="px-4 text-right">{money(invoice.lateFeeCents)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3} className="px-4 pb-3 text-right font-medium">Total</td>
              <td className="px-4 pb-3 text-right font-semibold">{money(invoice.totalCents)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {invoice.notes && (
        <section className="card p-5">
          <h2 className="muted text-xs uppercase tracking-wide">Notes</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm">{invoice.notes}</p>
        </section>
      )}
    </div>
  );
}

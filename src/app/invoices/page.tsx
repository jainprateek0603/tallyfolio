import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatDisplayDate } from "@/lib/dates";
import { INVOICE_STATUSES } from "@/lib/invoice-status";
import { listInvoices } from "@/lib/invoices";
import { formatMoney } from "@/lib/money";
import { pageHref, readInvoiceQuery, type SearchParams } from "@/lib/page-query";
import { requirePageUser } from "@/lib/session";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePageUser();
  const query = readInvoiceQuery(await searchParams);
  const result = await listInvoices(user.id, query);
  const filters = { q: query.q || undefined, status: query.status };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <Link href="/invoices/new" className="btn btn-primary">
          New invoice
        </Link>
      </div>

      <form className="flex flex-wrap gap-2" role="search">
        <input
          className="field max-w-xs"
          name="q"
          defaultValue={query.q}
          placeholder="Search number or client"
          aria-label="Search invoices"
        />
        <select className="field w-auto" name="status" defaultValue={query.status ?? ""} aria-label="Status">
          <option value="">All statuses</option>
          {INVOICE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <button className="btn" type="submit">
          Filter
        </button>
      </form>

      {result.items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-medium">No invoices {query.q || query.status ? "match these filters" : "yet"}.</p>
          <p className="muted mt-1 text-sm">
            {query.q || query.status ? (
              <Link href="/invoices" className="underline">
                Clear filters
              </Link>
            ) : (
              "Create one to bill a client."
            )}
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="muted text-left text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-3 font-medium sm:px-4">Number</th>
                <th className="px-3 py-3 font-medium sm:px-4">Client</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Status</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Due</th>
                <th className="px-3 py-3 text-right font-medium sm:px-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((invoice) => (
                <tr key={invoice.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                    <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    {invoice.client.company ?? invoice.client.name}
                    {/* On phones the status column is hidden, so show it here. */}
                    <span className="mt-1 block sm:hidden">
                      <StatusBadge status={invoice.status} />
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="muted hidden px-4 py-3 sm:table-cell">{formatDisplayDate(invoice.dueDate)}</td>
                  <td className="tabular whitespace-nowrap px-3 py-3 text-right sm:px-4">
                    {formatMoney(invoice.totalCents, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.totalPages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="muted">
            Page {result.page} of {result.totalPages} · {result.total} invoices
          </span>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link className="btn" href={pageHref("/invoices", filters, result.page - 1)}>
                Previous
              </Link>
            )}
            {result.page < result.totalPages && (
              <Link className="btn" href={pageHref("/invoices", filters, result.page + 1)}>
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}

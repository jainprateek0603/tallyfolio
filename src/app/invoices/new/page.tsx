import type { Metadata } from "next";
import Link from "next/link";
import { InvoiceForm } from "@/components/invoice-form";
import { formatIsoDate, startOfUtcDay } from "@/lib/dates";
import { loadInvoiceFormOptions } from "@/lib/invoice-form-options";
import { invoiceLimitMessage } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { requirePageUser } from "@/lib/session";

export const metadata: Metadata = { title: "New invoice" };

const DEFAULT_TERM_DAYS = 14;

export default async function NewInvoicePage() {
  const user = await requirePageUser();
  const count = await prisma.invoice.count({ where: { userId: user.id } });
  const limit = invoiceLimitMessage(user.plan, count);
  const { clients, projects } = await loadInvoiceFormOptions(user.id);
  const today = startOfUtcDay(new Date());

  return (
    <div className="space-y-6">
      <div>
        <Link href="/invoices" className="muted text-sm hover:underline">
          ← Invoices
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">New invoice</h1>
      </div>
      {limit ? (
        <div className="card p-6">
          <p className="font-medium">You have reached the Free plan limit.</p>
          <p className="muted mt-1 text-sm">{limit}</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="card p-6">
          <p className="font-medium">Add a client first.</p>
          <p className="muted mt-1 text-sm">Every invoice is billed to a client.</p>
        </div>
      ) : (
        <InvoiceForm
          clients={clients}
          projects={projects}
          initial={{
            clientId: "",
            projectId: "",
            issueDate: formatIsoDate(today),
            dueDate: formatIsoDate(new Date(today.getTime() + DEFAULT_TERM_DAYS * 86_400_000)),
            currency: user.currency,
            taxRateBps: user.defaultTaxRateBps,
            lateFeeBps: 0,
            notes: "",
            items: [],
          }}
        />
      )}
    </div>
  );
}

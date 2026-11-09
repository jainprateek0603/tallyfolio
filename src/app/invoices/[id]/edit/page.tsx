import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { InvoiceForm } from "@/components/invoice-form";
import { loadInvoiceFormOptions } from "@/lib/invoice-form-options";
import { loadInvoiceForPage } from "@/lib/load-invoice-page";
import { requirePageUser } from "@/lib/session";

export const metadata: Metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const invoice = await loadInvoiceForPage(user.id, params);
  if (invoice.status !== "DRAFT") redirect(`/invoices/${invoice.id}`);
  const { clients, projects } = await loadInvoiceFormOptions(user.id, invoice.client.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/invoices/${invoice.id}`} className="muted text-sm hover:underline">
          ← {invoice.number}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Edit {invoice.number}</h1>
      </div>
      <InvoiceForm
        invoiceId={invoice.id}
        clients={clients}
        projects={projects}
        initial={{
          clientId: invoice.client.id,
          projectId: invoice.project?.id ?? "",
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          currency: invoice.currency,
          taxRateBps: invoice.taxRateBps,
          lateFeeBps: invoice.lateFeeBps,
          notes: invoice.notes ?? "",
          items: invoice.items,
        }}
      />
    </div>
  );
}

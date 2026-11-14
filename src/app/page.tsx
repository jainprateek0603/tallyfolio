import type { Metadata } from "next";
import Link from "next/link";
import { InvoicePreview } from "@/components/invoice-preview";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Tallyfolio",
  description: "A ledger for independent work. Track clients, projects, and unpaid invoices.",
};

export default function HomePage() {
  return (
    <div className="ledger-lines min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 md:px-8">
        <SiteHeader />
        <main className="flex-1 py-12 md:py-16">
          <section className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,420px)]">
            <div>
              <h1 className="max-w-[14ch] font-display text-5xl leading-[1.05] text-ink md:text-6xl">
                Get paid for work you have already finished.
              </h1>
              <p className="mt-6 max-w-prose text-lg leading-8">
                Tallyfolio keeps your clients, projects, and invoices in one ledger, and shows what is still unpaid.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="bg-cobalt px-4 py-3 text-on-cobalt">
                  Create a free account
                </Link>
                <Link href="/pricing" className="border border-rule bg-sheet px-4 py-3">
                  View pricing
                </Link>
              </div>
            </div>
            <InvoicePreview />
          </section>

          <section className="mt-20 grid gap-10 border-t border-rule pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="max-w-prose">
              <h2 className="font-display text-3xl">How the ledger works</h2>
              <ol className="mt-6 list-decimal space-y-3 pl-5 leading-7">
                <li>Add the client you are billing.</li>
                <li>Track the project and the tasks on it.</li>
                <li>Send the invoice, then see it here when it is overdue.</li>
              </ol>
            </div>
            <div className="overflow-x-auto border border-rule bg-sheet">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Example of invoices still unpaid</caption>
                <thead>
                  <tr className="border-b border-rule">
                    <th scope="col" className="px-3 py-2 font-normal">Invoice</th>
                    <th scope="col" className="px-3 py-2 font-normal">Client</th>
                    <th scope="col" className="px-3 py-2 font-normal">Status</th>
                    <th scope="col" className="px-3 py-2 text-right font-normal">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-rule">
                    <td className="px-3 py-2">INV-1042</td>
                    <td className="px-3 py-2">Northwind Studio</td>
                    <td className="px-3 py-2 text-overdue">Overdue</td>
                    <td className="num px-3 py-2 text-right">$2,250.00</td>
                  </tr>
                  <tr className="border-b border-rule">
                    <td className="px-3 py-2">INV-1048</td>
                    <td className="px-3 py-2">Harbor Type</td>
                    <td className="px-3 py-2 text-cobalt">Sent</td>
                    <td className="num px-3 py-2 text-right">$900.00</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">INV-1031</td>
                    <td className="px-3 py-2">Field Notes</td>
                    <td className="px-3 py-2 text-pine">Paid</td>
                    <td className="num px-3 py-2 text-right">$1,400.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-16 grid gap-8 border-t border-rule pt-10 md:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl">Free</h2>
              <p className="mt-3 max-w-prose">
                Three active clients and five invoices. PDF export stays available.
              </p>
            </div>
            <div>
              <h2 className="font-display text-3xl text-brass">Pro</h2>
              <p className="mt-3 max-w-prose">
                Unlimited clients and invoices, plus an email when an invoice is overdue.
              </p>
              <p className="mt-4">
                <Link href="/pricing" className="underline">
                  Compare the plans
                </Link>
              </p>
            </div>
          </section>
        </main>
        <footer className="border-t border-rule py-6 text-sm text-muted">
          Tallyfolio is a ledger for independent work.
        </footer>
      </div>
    </div>
  );
}

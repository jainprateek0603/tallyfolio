import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="ledger-lines min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
        <SiteHeader />
        <main className="py-12">
          <h1 className="max-w-[18ch] font-display text-5xl leading-tight">Two plans. The work stays the same.</h1>
          <p className="mt-4 max-w-prose text-lg leading-8">
            Free is enough to send a few invoices. Pro is for a practice that should not stop at five.
          </p>
          <div className="mt-12 grid gap-10 md:grid-cols-2">
            <section>
              <h2 className="font-display text-3xl">Free</h2>
              <p className="mt-2 font-display text-5xl num">$0</p>
              <ul className="mt-6 space-y-2">
                <li>3 active clients</li>
                <li>5 invoices</li>
                <li>Projects, tasks, and PDF export</li>
                <li>Dashboard totals</li>
              </ul>
              <Link href="/register" className="mt-6 inline-flex bg-cobalt px-4 py-3 text-on-cobalt">
                Create a free account
              </Link>
            </section>
            <section className="border-t border-rule pt-8 md:border-t-0 md:border-l md:pt-0 md:pl-10">
              <h2 className="font-display text-3xl">Pro</h2>
              <p className="mt-2 font-display text-5xl text-brass num">$19</p>
              <p className="text-sm text-muted">a month, charged by Stripe at the price you connect</p>
              <ul className="mt-6 space-y-2">
                <li>Unlimited clients and invoices</li>
                <li>Email to the client when an invoice is overdue</li>
                <li>Everything in Free</li>
              </ul>
              <Link href="/register" className="mt-6 inline-flex border border-rule bg-sheet px-4 py-3">
                Create a free account
              </Link>
              <p className="mt-3 text-sm text-muted">Upgrade from Settings after you sign in.</p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

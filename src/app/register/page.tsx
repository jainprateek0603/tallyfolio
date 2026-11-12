import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth-forms";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="ledger-lines min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
        <SiteHeader />
        <main className="py-12">
          <h1 className="font-display text-5xl">Create a free account</h1>
          <p className="mt-3 max-w-prose">The Free plan includes 3 active clients and 5 invoices.</p>
          <div className="mt-8">
            <RegisterForm />
          </div>
          <p className="mt-6 text-sm">
            Already registered?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}

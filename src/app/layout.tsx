import type { Metadata } from "next";
import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Tallyfolio", template: "%s · Tallyfolio" },
  description: "Clients, projects and invoices for independent work.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="min-h-screen">
        {user && (
          <header className="border-b" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
              <Link href="/invoices" className="font-semibold tracking-tight">
                Tallyfolio
              </Link>
              <nav className="flex gap-4 text-sm">
                <Link href="/invoices" className="muted hover:underline">
                  Invoices
                </Link>
              </nav>
              <div className="ml-auto flex items-center gap-3 text-sm">
                <span className="muted hidden sm:inline">{user.email}</span>
                <span className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: "var(--line)" }}>
                  {user.plan === "PRO" ? "Pro" : "Free"}
                </span>
                <form action={signOutAction}>
                  <button className="btn" type="submit">
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </header>
        )}
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}

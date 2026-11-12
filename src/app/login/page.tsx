import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { SiteHeader } from "@/components/site-header";
import { firstParam } from "@/lib/query";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const callbackUrl = firstParam(raw.callbackUrl) ?? "/dashboard";
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";

  return (
    <div className="ledger-lines min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
        <SiteHeader />
        <main className="py-12">
          <h1 className="font-display text-5xl">Sign in</h1>
          <p className="mt-3 max-w-prose">Use the email and password on your account.</p>
          <div className="mt-8">
            <LoginForm callbackUrl={callbackUrl} googleEnabled={googleEnabled} />
          </div>
          <p className="mt-6 text-sm">
            New here?{" "}
            <Link href="/register" className="underline">
              Create a free account
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}

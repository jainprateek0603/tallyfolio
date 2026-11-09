import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { googleSignInAction, signInAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

const googleEnabled = () =>
  process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" &&
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export default async function SignInPage() {
  if (await getCurrentUser()) redirect("/invoices");

  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Sign in to Tallyfolio</h1>
      <p className="muted mb-6 text-sm">
        New here?{" "}
        <Link href="/register" className="underline">
          Create an account
        </Link>
      </p>
      <div className="card space-y-4 p-6">
        <AuthForm
          action={signInAction}
          submitLabel="Sign in"
          fields={[
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
          ]}
        />
        {googleEnabled() && (
          <form action={googleSignInAction}>
            <button className="btn w-full" type="submit">
              Continue with Google
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

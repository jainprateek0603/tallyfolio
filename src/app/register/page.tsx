import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { registerAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/invoices");

  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="muted mb-6 text-sm">
        Already have one?{" "}
        <Link href="/signin" className="underline">
          Sign in
        </Link>
      </p>
      <div className="card p-6">
        <AuthForm
          action={registerAction}
          submitLabel="Create account"
          fields={[
            { name: "name", label: "Name", type: "text", autoComplete: "name" },
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            {
              name: "password",
              label: "Password",
              type: "password",
              autoComplete: "new-password",
              hint: "At least 8 characters, with a letter and a number.",
            },
          ]}
        />
      </div>
    </div>
  );
}

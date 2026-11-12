"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { safeCallbackPath } from "@/lib/authz";
import { readFailure } from "@/lib/client-api";
import { Alert, Field, buttonClass, controlClass } from "@/components/ui";

export function LoginForm({ callbackUrl, googleEnabled }: { callbackUrl: string; googleEnabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const next = safeCallbackPath(callbackUrl);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: data.get("email"),
      password: data.get("password"),
      redirect: false,
    });
    setPending(false);
    if (!result || result.error) {
      setError("Email or password is incorrect, or the account is suspended.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="grid max-w-md gap-4">
      <form className="grid gap-3" onSubmit={onSubmit}>
        {error ? <Alert message={error} /> : null}
        <Field label="Email" htmlFor="login-email">
          <input id="login-email" name="email" type="email" autoComplete="email" required className={controlClass} />
        </Field>
        <Field label="Password" htmlFor="login-password">
          <input id="login-password" name="password" type="password" autoComplete="current-password" required className={controlClass} />
        </Field>
        <button className={buttonClass()} type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {googleEnabled ? (
        <button type="button" className={buttonClass("quiet")} onClick={() => void signIn("google", { callbackUrl: next })}>
          Continue with Google
        </button>
      ) : null}
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(readFailure(payload).message);
        return;
      }
      const signedIn = await signIn("credentials", {
        email: data.get("email"),
        password: data.get("password"),
        redirect: false,
      });
      if (!signedIn || signedIn.error) {
        setError("The account was created, but sign-in failed. Use the sign-in page.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("The account could not be created. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid max-w-md gap-3" onSubmit={onSubmit}>
      {error ? <Alert message={error} /> : null}
      <Field label="Name" htmlFor="register-name">
        <input id="register-name" name="name" autoComplete="name" required className={controlClass} />
      </Field>
      <Field label="Email" htmlFor="register-email">
        <input id="register-email" name="email" type="email" autoComplete="email" required className={controlClass} />
      </Field>
      <Field label="Password" htmlFor="register-password" hint="At least 8 characters, with a letter and a number.">
        <input id="register-password" name="password" type="password" autoComplete="new-password" required className={controlClass} />
      </Field>
      <button className={buttonClass()} type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create a free account"}
      </button>
    </form>
  );
}

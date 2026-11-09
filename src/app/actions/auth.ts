"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { headers } from "next/headers";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { ApiError } from "@/lib/api-error";
import { clientIp } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/schemas";
import { registerUser } from "@/lib/users";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** What was typed, so the form can refill after React resets it. Never includes passwords. */
  values?: Record<string, string>;
};

const SIGN_IN_ERRORS: Record<string, string> = {
  rate_limited: "Too many attempts. Try again in 15 minutes.",
};

/** Signs in and redirects. Next's redirect is thrown, so only auth errors are caught. */
async function signInWithPassword(email: string, password: string): Promise<FormState> {
  try {
    await signIn("credentials", { email, password, redirectTo: "/invoices" });
    return {};
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      return { error: SIGN_IN_ERRORS[error.code] ?? "Email or password is incorrect." };
    }
    if (error instanceof AuthError) {
      return { error: "Could not sign in. Try again." };
    }
    throw error;
  }
}

export async function signInAction(_state: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const result = await signInWithPassword(email, String(formData.get("password") ?? ""));
  return { ...result, values: { email } };
}

export async function registerAction(_state: FormState, formData: FormData): Promise<FormState> {
  const values = { name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? "") };
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  try {
    await registerUser(parsed.data, clientIp(await headers()));
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message, values };
    throw error;
  }
  return { ...(await signInWithPassword(parsed.data.email, parsed.data.password)), values };
}

export async function googleSignInAction() {
  await signIn("google", { redirectTo: "/invoices" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/signin" });
}

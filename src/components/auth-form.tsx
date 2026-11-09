"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

type Field = {
  name: string;
  label: string;
  type: string;
  autoComplete: string;
  hint?: string;
};

export function AuthForm({
  action,
  fields,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  fields: Field[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <p role="alert" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "oklch(0.75 0.12 25)", color: "oklch(0.5 0.18 25)" }}>
          {state.error}
        </p>
      )}
      {fields.map((field) => {
        const errors = state.fieldErrors?.[field.name];
        return (
          <label key={field.name} className="block space-y-1">
            <span className="text-sm font-medium">{field.label}</span>
            <input
              className="field"
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              defaultValue={field.type === "password" ? undefined : state.values?.[field.name]}
              aria-invalid={errors ? true : undefined}
              required
            />
            {errors ? (
              <span className="block text-xs" style={{ color: "oklch(0.5 0.18 25)" }}>
                {errors[0]}
              </span>
            ) : (
              field.hint && <span className="muted block text-xs">{field.hint}</span>
            )}
          </label>
        );
      })}
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}

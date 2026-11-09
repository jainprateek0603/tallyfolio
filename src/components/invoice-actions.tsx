"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { InvoiceStatus } from "@/lib/invoice-status";

type Action = { label: string; status: "DRAFT" | "SENT" | "PAID"; primary?: boolean };

const ACTIONS: Record<InvoiceStatus, Action[]> = {
  DRAFT: [{ label: "Mark as sent", status: "SENT", primary: true }],
  SENT: [
    { label: "Mark as paid", status: "PAID", primary: true },
    { label: "Back to draft", status: "DRAFT" },
  ],
  OVERDUE: [{ label: "Mark as paid", status: "PAID", primary: true }],
  PAID: [],
};

export function InvoiceActions({ id, status }: { id: string; status: InvoiceStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(request: () => Promise<Response>, after: () => void) {
    setBusy(true);
    setError(null);
    try {
      const response = await request();
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error?.message ?? "Something went wrong.");
        return;
      }
      after();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const changeStatus = (next: Action["status"]) =>
    run(
      () =>
        fetch(`/api/invoices/${id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        }),
      () => router.refresh(),
    );

  const remove = () => {
    if (!window.confirm("Delete this draft? This cannot be undone.")) return;
    run(
      () => fetch(`/api/invoices/${id}`, { method: "DELETE" }),
      () => {
        router.push("/invoices");
        router.refresh();
      },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {ACTIONS[status].map((action) => (
          <button
            key={action.status}
            type="button"
            className={action.primary ? "btn btn-primary" : "btn"}
            disabled={busy}
            onClick={() => changeStatus(action.status)}
          >
            {action.label}
          </button>
        ))}
        {status === "DRAFT" && (
          <>
            <Link href={`/invoices/${id}/edit`} className="btn">
              Edit
            </Link>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={remove}>
              Delete
            </button>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm" style={{ color: "oklch(0.5 0.18 25)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

import { startOfUtcDay } from "@/lib/dates";

export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

const TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["PAID", "DRAFT"],
  OVERDUE: ["PAID"],
  PAID: [],
};

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function effectiveStatus(
  status: InvoiceStatus,
  dueDate: Date,
  now: Date,
): InvoiceStatus {
  if (status !== "SENT" && status !== "OVERDUE") return status;
  return startOfUtcDay(dueDate) < startOfUtcDay(now) ? "OVERDUE" : "SENT";
}

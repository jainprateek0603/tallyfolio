export const FREE_CLIENT_LIMIT = 3;
export const FREE_INVOICE_LIMIT = 5;

export type PlanName = "FREE" | "PRO";

export function clientLimitMessage(plan: PlanName, activeClientCount: number): string | null {
  if (plan === "PRO") return null;
  if (activeClientCount >= FREE_CLIENT_LIMIT) {
    return `The Free plan includes ${FREE_CLIENT_LIMIT} active clients. Upgrade to Pro for unlimited clients.`;
  }
  return null;
}

export function invoiceLimitMessage(plan: PlanName, invoiceCount: number): string | null {
  if (plan === "PRO") return null;
  if (invoiceCount >= FREE_INVOICE_LIMIT) {
    return `The Free plan includes ${FREE_INVOICE_LIMIT} invoices. Upgrade to Pro for unlimited invoices.`;
  }
  return null;
}

export function canSendReminderEmails(plan: PlanName): boolean {
  return plan === "PRO";
}

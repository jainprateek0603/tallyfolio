import type { InvoiceStatus } from "@/lib/invoice-status";

const STYLES: Record<InvoiceStatus, { label: string; hue: number; chroma: number }> = {
  DRAFT: { label: "Draft", hue: 255, chroma: 0.01 },
  SENT: { label: "Sent", hue: 255, chroma: 0.12 },
  OVERDUE: { label: "Overdue", hue: 25, chroma: 0.16 },
  PAID: { label: "Paid", hue: 150, chroma: 0.13 },
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, hue, chroma } = STYLES[status];
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        color: `oklch(0.5 ${chroma} ${hue})`,
        background: `oklch(0.6 ${chroma} ${hue} / 0.12)`,
      }}
    >
      {label}
    </span>
  );
}

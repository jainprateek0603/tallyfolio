import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-error";
import { getInvoice } from "@/lib/invoices";
import { idSchema } from "@/lib/schemas";

/** Loads an invoice for a page, turning a bad id or someone else's invoice into a 404. */
export async function loadInvoiceForPage(userId: string, params: Promise<{ id: string }>) {
  const parsed = idSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  try {
    return await getInvoice(userId, parsed.data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

import { handleError, ok, parseBody, readJson } from "@/lib/http";
import { changeInvoiceStatus } from "@/lib/invoices";
import { readId } from "@/lib/params";
import { invoiceStatusSchema } from "@/lib/schemas";
import { requireApiUser } from "@/lib/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const id = await readId(params);
    const { status } = parseBody(invoiceStatusSchema, await readJson(request));
    return ok(await changeInvoiceStatus(user.id, id, status));
  } catch (error) {
    return handleError(error);
  }
}

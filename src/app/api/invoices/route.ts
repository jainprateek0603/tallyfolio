import { handleError, ok, parseBody, readJson } from "@/lib/http";
import { createInvoice, listInvoices } from "@/lib/invoices";
import { parseQuery } from "@/lib/query";
import { createInvoiceSchema, invoiceListSchema } from "@/lib/schemas";
import { requireApiUser } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const query = parseQuery(invoiceListSchema, new URL(request.url).searchParams);
    return ok(await listInvoices(user.id, query));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = parseBody(createInvoiceSchema, await readJson(request));
    return ok(await createInvoice(user, input), 201);
  } catch (error) {
    return handleError(error);
  }
}

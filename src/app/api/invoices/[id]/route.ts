import { handleError, ok, parseBody, readJson } from "@/lib/http";
import { deleteInvoice, getInvoice, updateInvoice } from "@/lib/invoices";
import { readId } from "@/lib/params";
import { updateInvoiceSchema } from "@/lib/schemas";
import { requireApiUser } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireApiUser();
    return ok(await getInvoice(user.id, await readId(params)));
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireApiUser();
    const id = await readId(params);
    const input = parseBody(updateInvoiceSchema, await readJson(request));
    return ok(await updateInvoice(user.id, id, input));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireApiUser();
    await deleteInvoice(user.id, await readId(params));
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}

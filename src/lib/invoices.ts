import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api-error";
import { formatIsoDate, parseIsoDate, startOfUtcDay } from "@/lib/dates";
import { mergeInvoiceDates } from "@/lib/invoice-dates";
import { summarize } from "@/lib/invoice-math";
import { canTransition, effectiveStatus, type InvoiceStatus } from "@/lib/invoice-status";
import { invoiceLimitMessage } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import type { CreateInvoiceInput, UpdateInvoiceInput } from "@/lib/schemas";

/** The parts of the signed-in user the invoice service needs. */
export type InvoiceOwner = {
  id: string;
  plan: "FREE" | "PRO";
  currency: string;
  defaultTaxRateBps: number;
};

const invoiceInclude = {
  client: { select: { id: true, name: true, company: true, email: true } },
  project: { select: { id: true, name: true } },
  items: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.InvoiceInclude;

type InvoiceRecord = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

const notFound = () => new ApiError(404, "NOT_FOUND", "Invoice not found.");

export function serializeInvoice(invoice: InvoiceRecord, now = new Date()) {
  const totals = summarize(invoice.items, invoice.taxRateBps);
  return {
    id: invoice.id,
    number: invoice.number,
    status: effectiveStatus(invoice.status, invoice.dueDate, now),
    issueDate: formatIsoDate(invoice.issueDate),
    dueDate: formatIsoDate(invoice.dueDate),
    currency: invoice.currency,
    taxRateBps: invoice.taxRateBps,
    lateFeeBps: invoice.lateFeeBps,
    notes: invoice.notes,
    sentAt: invoice.sentAt?.toISOString() ?? null,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    hasPublicLink: invoice.publicToken !== null,
    client: invoice.client,
    project: invoice.project,
    items: invoice.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantityHundredths: item.quantityHundredths,
      unitCents: item.unitCents,
    })),
    subtotalCents: totals.subtotalCents,
    taxCents: totals.taxCents,
    lateFeeCents: invoice.lateFeeCents,
    totalCents: totals.totalCents + invoice.lateFeeCents,
  };
}

export type InvoiceView = ReturnType<typeof serializeInvoice>;

async function findOwned(userId: string, id: string): Promise<InvoiceRecord> {
  const invoice = await prisma.invoice.findFirst({ where: { id, userId }, include: invoiceInclude });
  if (!invoice) throw notFound();
  return invoice;
}

/** Checks that the client (and project, when given) belong to this user and fit together. */
async function assertClientAndProject(userId: string, clientId: string, projectId: string | null) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
    select: { archived: true },
  });
  if (!client) {
    throw new ApiError(422, "VALIDATION_ERROR", "Check the highlighted fields.", {
      formErrors: [],
      fieldErrors: { clientId: ["Choose one of your clients."] },
    });
  }
  if (client.archived) {
    throw new ApiError(422, "VALIDATION_ERROR", "Check the highlighted fields.", {
      formErrors: [],
      fieldErrors: { clientId: ["This client is archived. Restore it first."] },
    });
  }
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId, clientId },
      select: { id: true },
    });
    if (!project) {
      throw new ApiError(422, "VALIDATION_ERROR", "Check the highlighted fields.", {
        formErrors: [],
        fieldErrors: { projectId: ["Choose a project for this client."] },
      });
    }
  }
}

const itemRows = (items: CreateInvoiceInput["items"]) =>
  items.map((item, sortOrder) => ({ ...item, sortOrder }));

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export type InvoiceListQuery = {
  q: string;
  status?: InvoiceStatus;
  clientId?: string;
  page: number;
  limit: number;
};

/** OVERDUE is derived from SENT + due date, so status filters are translated here. */
function statusFilter(status: InvoiceStatus | undefined, now: Date): Prisma.InvoiceWhereInput {
  const today = startOfUtcDay(now);
  switch (status) {
    case undefined:
      return {};
    case "OVERDUE":
      return { status: { in: ["SENT", "OVERDUE"] }, dueDate: { lt: today } };
    case "SENT":
      return { status: { in: ["SENT", "OVERDUE"] }, dueDate: { gte: today } };
    default:
      return { status };
  }
}

export async function listInvoices(userId: string, query: InvoiceListQuery, now = new Date()) {
  const where: Prisma.InvoiceWhereInput = {
    userId,
    ...statusFilter(query.status, now),
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.q
      ? {
          OR: [
            { number: { contains: query.q } },
            { client: { name: { contains: query.q } } },
            { client: { company: { contains: query.q } } },
          ],
        }
      : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: invoiceInclude,
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return {
    items: rows.map((row) => serializeInvoice(row, now)),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export async function getInvoice(userId: string, id: string) {
  return serializeInvoice(await findOwned(userId, id));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createInvoice(owner: InvoiceOwner, input: CreateInvoiceInput) {
  const count = await prisma.invoice.count({ where: { userId: owner.id } });
  const limit = invoiceLimitMessage(owner.plan, count);
  if (limit) throw new ApiError(403, "PLAN_LIMIT", limit);

  const projectId = input.projectId ?? null;
  await assertClientAndProject(owner.id, input.clientId, projectId);

  const created = await prisma.$transaction(async (tx) => {
    // Incrementing inside the transaction gives each invoice its own number.
    const { invoiceSequence } = await tx.user.update({
      where: { id: owner.id },
      data: { invoiceSequence: { increment: 1 } },
      select: { invoiceSequence: true },
    });
    return tx.invoice.create({
      data: {
        userId: owner.id,
        clientId: input.clientId,
        projectId,
        number: `INV-${invoiceSequence}`,
        issueDate: parseIsoDate(input.issueDate),
        dueDate: parseIsoDate(input.dueDate),
        currency: input.currency ?? owner.currency,
        taxRateBps: input.taxRateBps ?? owner.defaultTaxRateBps,
        lateFeeBps: input.lateFeeBps ?? 0,
        notes: input.notes,
        items: { create: itemRows(input.items) },
      },
      include: invoiceInclude,
    });
  });
  return serializeInvoice(created);
}

export async function updateInvoice(userId: string, id: string, input: UpdateInvoiceInput) {
  const existing = await findOwned(userId, id);
  if (existing.status !== "DRAFT") {
    throw new ApiError(409, "NOT_EDITABLE", "Only draft invoices can be edited. Move it back to draft first.");
  }

  const clientId = input.clientId ?? existing.clientId;
  // A new client invalidates the old project unless a project is sent too.
  const projectId =
    input.projectId !== undefined
      ? input.projectId
      : input.clientId && input.clientId !== existing.clientId
        ? null
        : existing.projectId;
  if (input.clientId !== undefined || input.projectId !== undefined) {
    await assertClientAndProject(userId, clientId, projectId);
  }
  const dates = mergeInvoiceDates(existing, input);

  const updated = await prisma.$transaction(async (tx) => {
    if (input.items) await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    return tx.invoice.update({
      where: { id },
      data: {
        clientId,
        projectId,
        issueDate: dates.issueDate,
        dueDate: dates.dueDate,
        currency: input.currency,
        taxRateBps: input.taxRateBps,
        lateFeeBps: input.lateFeeBps,
        notes: input.notes,
        ...(input.items ? { items: { create: itemRows(input.items) } } : {}),
      },
      include: invoiceInclude,
    });
  });
  return serializeInvoice(updated);
}

export async function deleteInvoice(userId: string, id: string) {
  const existing = await findOwned(userId, id);
  if (existing.status !== "DRAFT") {
    throw new ApiError(409, "NOT_DELETABLE", "Sent and paid invoices are records. Only drafts can be deleted.");
  }
  await prisma.invoice.delete({ where: { id } });
}

export async function changeInvoiceStatus(
  userId: string,
  id: string,
  to: "DRAFT" | "SENT" | "PAID",
  now = new Date(),
) {
  const existing = await findOwned(userId, id);
  const from = effectiveStatus(existing.status, existing.dueDate, now);
  if (!canTransition(from, to)) {
    throw new ApiError(409, "INVALID_TRANSITION", `A ${from.toLowerCase()} invoice cannot be marked ${to.toLowerCase()}.`);
  }

  const data: Prisma.InvoiceUpdateInput =
    to === "SENT"
      ? { status: "SENT", sentAt: now, publicToken: existing.publicToken ?? randomBytes(24).toString("base64url") }
      : to === "PAID"
        ? { status: "PAID", paidAt: now }
        : // Back to draft: the public pay link stops working until it is sent again.
          { status: "DRAFT", sentAt: null, publicToken: null };

  const updated = await prisma.invoice.update({ where: { id }, data, include: invoiceInclude });
  return serializeInvoice(updated, now);
}

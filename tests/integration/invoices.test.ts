import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  changeInvoiceStatus,
  createInvoice,
  deleteInvoice,
  getInvoice,
  listInvoices,
  updateInvoice,
  type InvoiceOwner,
} from "@/lib/invoices";
import { prisma } from "@/lib/prisma";
import { resetRateLimits } from "@/lib/rate-limit";
import { createInvoiceSchema, registerSchema } from "@/lib/schemas";
import { registerUser, verifyPassword } from "@/lib/users";

afterAll(() => prisma.$disconnect());
beforeEach(() => resetRateLimits());

async function makeOwner(plan: "FREE" | "PRO" = "PRO"): Promise<InvoiceOwner & { clientId: string }> {
  const user = await prisma.user.create({
    data: { email: `${randomUUID()}@test.local`, plan, currency: "USD", defaultTaxRateBps: 1_000 },
  });
  const client = await prisma.client.create({ data: { userId: user.id, name: "Acme" } });
  return { id: user.id, plan, currency: "USD", defaultTaxRateBps: 1_000, clientId: client.id };
}

const draftInput = (clientId: string, overrides: Record<string, unknown> = {}) =>
  createInvoiceSchema.parse({
    clientId,
    issueDate: "2026-05-01",
    dueDate: "2026-05-15",
    items: [{ description: "Design", quantityHundredths: 150, unitCents: 10_000 }],
    ...overrides,
  });

describe("createInvoice", () => {
  it("numbers invoices per user and applies the user's defaults", async () => {
    const owner = await makeOwner();
    const first = await createInvoice(owner, draftInput(owner.clientId));
    const second = await createInvoice(owner, draftInput(owner.clientId));
    expect([first.number, second.number]).toEqual(["INV-1001", "INV-1002"]);
    expect(first).toMatchObject({
      status: "DRAFT",
      currency: "USD",
      taxRateBps: 1_000,
      subtotalCents: 15_000,
      taxCents: 1_500,
      totalCents: 16_500,
    });
  });

  it("enforces the Free plan invoice limit", async () => {
    const owner = await makeOwner("FREE");
    for (let index = 0; index < 5; index += 1) await createInvoice(owner, draftInput(owner.clientId));
    await expect(createInvoice(owner, draftInput(owner.clientId))).rejects.toMatchObject({
      status: 403,
      code: "PLAN_LIMIT",
    });
  });

  it("rejects another user's client", async () => {
    const owner = await makeOwner();
    const stranger = await makeOwner();
    await expect(createInvoice(owner, draftInput(stranger.clientId))).rejects.toMatchObject({ status: 422 });
  });

  it("rejects a project that belongs to a different client", async () => {
    const owner = await makeOwner();
    const other = await prisma.client.create({ data: { userId: owner.id, name: "Other" } });
    const project = await prisma.project.create({ data: { userId: owner.id, clientId: other.id, name: "P" } });
    await expect(
      createInvoice(owner, draftInput(owner.clientId, { projectId: project.id })),
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe("reading and isolation", () => {
  it("hides one user's invoices from another", async () => {
    const owner = await makeOwner();
    const stranger = await makeOwner();
    const invoice = await createInvoice(owner, draftInput(owner.clientId));
    await expect(getInvoice(stranger.id, invoice.id)).rejects.toMatchObject({ status: 404 });
    await expect(updateInvoice(stranger.id, invoice.id, { notes: "x" })).rejects.toMatchObject({ status: 404 });
    await expect(deleteInvoice(stranger.id, invoice.id)).rejects.toMatchObject({ status: 404 });
    expect((await listInvoices(stranger.id, { q: "", page: 1, limit: 20 })).total).toBe(0);
  });

  it("filters derived OVERDUE and SENT statuses by due date", async () => {
    const owner = await makeOwner();
    const now = new Date(Date.UTC(2026, 4, 20));
    const late = await createInvoice(owner, draftInput(owner.clientId, { dueDate: "2026-05-15" }));
    const onTime = await createInvoice(owner, draftInput(owner.clientId, { dueDate: "2026-05-30" }));
    await changeInvoiceStatus(owner.id, late.id, "SENT", now);
    await changeInvoiceStatus(owner.id, onTime.id, "SENT", now);

    const overdue = await listInvoices(owner.id, { q: "", status: "OVERDUE", page: 1, limit: 20 }, now);
    const sent = await listInvoices(owner.id, { q: "", status: "SENT", page: 1, limit: 20 }, now);
    expect(overdue.items.map((item) => item.id)).toEqual([late.id]);
    expect(sent.items.map((item) => item.id)).toEqual([onTime.id]);
  });
});

describe("updateInvoice", () => {
  it("replaces line items on a draft", async () => {
    const owner = await makeOwner();
    const invoice = await createInvoice(owner, draftInput(owner.clientId));
    const updated = await updateInvoice(owner.id, invoice.id, {
      items: [
        { description: "A", quantityHundredths: 100, unitCents: 100 },
        { description: "B", quantityHundredths: 200, unitCents: 100 },
      ],
    });
    expect(updated.items.map((item) => item.description)).toEqual(["A", "B"]);
    expect(updated.subtotalCents).toBe(300);
  });

  it("checks a single new date against the stored one", async () => {
    const owner = await makeOwner();
    const invoice = await createInvoice(owner, draftInput(owner.clientId));
    await expect(updateInvoice(owner.id, invoice.id, { dueDate: "2026-04-01" })).rejects.toMatchObject({
      status: 422,
    });
  });

  it("refuses to edit a sent invoice", async () => {
    const owner = await makeOwner();
    const invoice = await createInvoice(owner, draftInput(owner.clientId));
    await changeInvoiceStatus(owner.id, invoice.id, "SENT");
    await expect(updateInvoice(owner.id, invoice.id, { notes: "late edit" })).rejects.toMatchObject({
      status: 409,
      code: "NOT_EDITABLE",
    });
  });
});

describe("status changes", () => {
  it("moves draft → sent → paid and records timestamps and the pay link", async () => {
    const owner = await makeOwner();
    const invoice = await createInvoice(owner, draftInput(owner.clientId, { dueDate: "2099-01-01" }));
    const sent = await changeInvoiceStatus(owner.id, invoice.id, "SENT");
    expect(sent).toMatchObject({ status: "SENT", hasPublicLink: true });
    expect(sent.sentAt).not.toBeNull();
    const paid = await changeInvoiceStatus(owner.id, invoice.id, "PAID");
    expect(paid.status).toBe("PAID");
    expect(paid.paidAt).not.toBeNull();
  });

  it("revokes the pay link when a sent invoice goes back to draft", async () => {
    const owner = await makeOwner();
    const invoice = await createInvoice(owner, draftInput(owner.clientId, { dueDate: "2099-01-01" }));
    await changeInvoiceStatus(owner.id, invoice.id, "SENT");
    const draft = await changeInvoiceStatus(owner.id, invoice.id, "DRAFT");
    expect(draft).toMatchObject({ status: "DRAFT", hasPublicLink: false, sentAt: null });
  });

  it("rejects transitions the state machine does not allow", async () => {
    const owner = await makeOwner();
    const invoice = await createInvoice(owner, draftInput(owner.clientId));
    await expect(changeInvoiceStatus(owner.id, invoice.id, "PAID")).rejects.toMatchObject({
      status: 409,
      code: "INVALID_TRANSITION",
    });
  });

  it("does not allow an overdue invoice back to draft", async () => {
    const owner = await makeOwner();
    const invoice = await createInvoice(owner, draftInput(owner.clientId, { dueDate: "2026-05-15" }));
    await changeInvoiceStatus(owner.id, invoice.id, "SENT", new Date(Date.UTC(2026, 4, 1)));
    await expect(
      changeInvoiceStatus(owner.id, invoice.id, "DRAFT", new Date(Date.UTC(2026, 5, 1))),
    ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("only deletes drafts", async () => {
    const owner = await makeOwner();
    const sent = await createInvoice(owner, draftInput(owner.clientId));
    await changeInvoiceStatus(owner.id, sent.id, "SENT");
    await expect(deleteInvoice(owner.id, sent.id)).rejects.toMatchObject({ status: 409 });

    const draft = await createInvoice(owner, draftInput(owner.clientId));
    await deleteInvoice(owner.id, draft.id);
    await expect(getInvoice(owner.id, draft.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe("registration and passwords", () => {
  const input = () =>
    registerSchema.parse({ name: "Ada", email: `${randomUUID()}@test.local`, password: "correct horse 1" });

  it("registers, hashes the password and verifies it", async () => {
    const details = input();
    const user = await registerUser(details, "203.0.113.1");
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.passwordHash).not.toContain("correct horse");
    expect((await verifyPassword(details.email, details.password))?.id).toBe(user.id);
    expect(await verifyPassword(details.email, "wrong password 1")).toBeNull();
  });

  it("rejects a duplicate email with 409", async () => {
    const details = input();
    await registerUser(details, "203.0.113.2");
    await expect(registerUser(details, "203.0.113.2")).rejects.toMatchObject({ status: 409, code: "EMAIL_TAKEN" });
  });

  it("refuses to sign in a suspended user", async () => {
    const details = input();
    const user = await registerUser(details, "203.0.113.3");
    await prisma.user.update({ where: { id: user.id }, data: { suspended: true } });
    expect(await verifyPassword(details.email, details.password)).toBeNull();
  });

  it("returns null for an unknown email", async () => {
    expect(await verifyPassword("nobody@test.local", "whatever 1")).toBeNull();
  });
});

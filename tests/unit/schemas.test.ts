import { describe, expect, it } from "vitest";
import {
  createInvoiceSchema,
  createProjectSchema,
  createTaskSchema,
  expenseSchema,
  passwordSchema,
  updateClientSchema,
  updateInvoiceSchema,
  updateProjectSchema,
  updateTaskSchema,
} from "@/lib/schemas";

const line = { description: "Design", quantityHundredths: 100, unitCents: 5_000 };

describe("update schemas keep omitted fields omitted", () => {
  it("does not reset project status on a partial update", () => {
    expect(updateProjectSchema.parse({ name: "Renamed" })).toEqual({ name: "Renamed" });
  });

  it("does not reset task status or priority on a partial update", () => {
    expect(updateTaskSchema.parse({ title: "Renamed" })).toEqual({ title: "Renamed" });
  });

  it("still applies defaults on create", () => {
    expect(createProjectSchema.parse({ clientId: "c1", name: "P" }).status).toBe("ACTIVE");
    const task = createTaskSchema.parse({ projectId: "p1", title: "T" });
    expect(task.status).toBe("TODO");
    expect(task.priority).toBe("MEDIUM");
  });

  it("rejects an empty update", () => {
    expect(updateClientSchema.safeParse({}).success).toBe(false);
    expect(updateInvoiceSchema.safeParse({}).success).toBe(false);
  });
});

describe("invoice dates", () => {
  const base = { clientId: "c1", items: [line] };

  it("rejects a due date before the issue date on create", () => {
    const result = createInvoiceSchema.safeParse({ ...base, issueDate: "2026-05-10", dueDate: "2026-05-01" });
    expect(result.success).toBe(false);
  });

  it("rejects a due date before the issue date on update", () => {
    const result = updateInvoiceSchema.safeParse({ issueDate: "2026-05-10", dueDate: "2026-05-01" });
    expect(result.success).toBe(false);
  });

  it("allows updating late fee and currency", () => {
    expect(updateInvoiceSchema.parse({ lateFeeBps: 150, currency: "eur" })).toEqual({
      lateFeeBps: 150,
      currency: "EUR",
    });
  });

  it("turns blank notes into null", () => {
    expect(updateInvoiceSchema.parse({ notes: "  " })).toEqual({ notes: null });
  });
});

describe("currency", () => {
  const expense = {
    description: "Hosting",
    amountCents: 100,
    category: "SOFTWARE",
    incurredOn: "2026-01-01",
  };

  it("uppercases a valid code", () => {
    expect(expenseSchema.parse({ ...expense, currency: "usd" }).currency).toBe("USD");
  });

  it("rejects malformed codes", () => {
    expect(expenseSchema.safeParse({ ...expense, currency: "US" }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...expense, currency: "U5D" }).success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("accepts a normal password", () => {
    expect(passwordSchema.safeParse("hunter2hunter").success).toBe(true);
  });

  it("limits by bytes, since bcrypt ignores everything after 72 bytes", () => {
    const multibyte = "a1" + "é".repeat(40); // 42 characters, 82 bytes
    expect(passwordSchema.safeParse(multibyte).success).toBe(false);
  });
});

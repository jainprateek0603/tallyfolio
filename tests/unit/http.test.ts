import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { handleError, ok, parseBody, readJson } from "@/lib/http";
import { mergeInvoiceDates } from "@/lib/invoice-dates";
import { parseQuery } from "@/lib/query";

afterEach(() => {
  vi.restoreAllMocks();
});

const post = (body: string) =>
  new Request("http://localhost/api", { method: "POST", body, headers: { "Content-Type": "application/json" } });

describe("ok", () => {
  it("wraps data and sets the status", async () => {
    const response = ok({ id: "1" }, 201);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { id: "1" } });
  });
});

describe("readJson", () => {
  it("parses a JSON body", async () => {
    expect(await readJson(post('{"a":1}'))).toEqual({ a: 1 });
  });

  it("turns a malformed body into a 400", async () => {
    await expect(readJson(post("{nope"))).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" });
  });
});

describe("parseBody", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("returns parsed data", () => {
    expect(parseBody(schema, { name: "Ada" })).toEqual({ name: "Ada" });
  });

  it("throws a 422 with field errors", () => {
    try {
      parseBody(schema, { name: "" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(422);
      expect(apiError.details).toMatchObject({ fieldErrors: { name: expect.any(Array) } });
    }
  });
});

describe("parseQuery", () => {
  const schema = z.object({ page: z.coerce.number().int().min(1).optional() });

  it("keeps the first value and drops empty ones", () => {
    expect(parseQuery(schema, new URLSearchParams("page=2&page=5"))).toEqual({ page: 2 });
    expect(parseQuery(schema, new URLSearchParams("page="))).toEqual({});
  });

  it("throws a 422 on bad filters", () => {
    expect(() => parseQuery(schema, new URLSearchParams("page=0"))).toThrow(ApiError);
  });
});

describe("handleError", () => {
  it("returns an ApiError as its own status and body", async () => {
    const response = await handleError(new ApiError(404, "NOT_FOUND", "Not found."));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "NOT_FOUND", message: "Not found." } });
  });

  it("hides unexpected errors behind a generic 500 and logs them", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await handleError(new Error("database password is hunter2"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: { code: "INTERNAL", message: "Something went wrong." } });
    expect(JSON.stringify(body)).not.toContain("hunter2");
    expect(logged).toHaveBeenCalled();
  });
});

describe("mergeInvoiceDates", () => {
  const stored = {
    issueDate: new Date(Date.UTC(2026, 4, 1)),
    dueDate: new Date(Date.UTC(2026, 4, 15)),
  };

  it("keeps stored dates that are not patched", () => {
    expect(mergeInvoiceDates(stored, { dueDate: "2026-05-20" })).toEqual({
      issueDate: stored.issueDate,
      dueDate: new Date(Date.UTC(2026, 4, 20)),
    });
  });

  it("rejects moving the issue date past the stored due date", () => {
    expect(() => mergeInvoiceDates(stored, { issueDate: "2026-05-16" })).toThrow(ApiError);
  });

  it("rejects moving the due date before the stored issue date", () => {
    expect(() => mergeInvoiceDates(stored, { dueDate: "2026-04-30" })).toThrow(
      expect.objectContaining({
        status: 422,
        details: { formErrors: [], fieldErrors: { dueDate: [expect.stringMatching(/on or after/i)] } },
      }),
    );
  });
});

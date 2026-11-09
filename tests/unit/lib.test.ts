import { describe, expect, it } from "vitest";
import { addUtcMonths, formatIsoDate, monthKey, parseIsoDate } from "@/lib/dates";
import { lineTotalCents, summarize } from "@/lib/invoice-math";
import { canTransition, effectiveStatus } from "@/lib/invoice-status";
import { parseSentryDsn } from "@/lib/log";
import { formatMoney, isCurrencyCode } from "@/lib/money";
import { pageHref, readClientQuery, readInvoiceQuery } from "@/lib/page-query";
import { clientLimitMessage, invoiceLimitMessage } from "@/lib/plan";

describe("dates", () => {
  it("round-trips an ISO date", () => {
    expect(formatIsoDate(parseIsoDate("2026-02-28"))).toBe("2026-02-28");
  });

  it("rejects impossible dates", () => {
    expect(() => parseIsoDate("2026-02-30")).toThrow();
    expect(() => parseIsoDate("26-2-1")).toThrow();
  });

  it("moves to the first of a later month across a year", () => {
    expect(monthKey(addUtcMonths(new Date(Date.UTC(2026, 10, 30)), 2))).toBe("2027-01");
  });
});

describe("invoice math", () => {
  it("rounds line totals to the cent", () => {
    expect(lineTotalCents(150, 333)).toBe(500); // 1.5 x $3.33 = $4.995
  });

  it("adds tax in basis points", () => {
    expect(summarize([{ quantityHundredths: 200, unitCents: 1_000 }], 825)).toEqual({
      subtotalCents: 2_000,
      taxCents: 165,
      totalCents: 2_165,
    });
  });
});

describe("invoice status", () => {
  const due = new Date(Date.UTC(2026, 4, 10));

  it("is overdue only after the due day ends", () => {
    expect(effectiveStatus("SENT", due, new Date(Date.UTC(2026, 4, 10, 23, 59)))).toBe("SENT");
    expect(effectiveStatus("SENT", due, new Date(Date.UTC(2026, 4, 11)))).toBe("OVERDUE");
  });

  it("leaves drafts and paid invoices alone", () => {
    const later = new Date(Date.UTC(2027, 0, 1));
    expect(effectiveStatus("DRAFT", due, later)).toBe("DRAFT");
    expect(effectiveStatus("PAID", due, later)).toBe("PAID");
  });

  it("never moves a paid invoice", () => {
    expect(canTransition("PAID", "DRAFT")).toBe(false);
    expect(canTransition("SENT", "PAID")).toBe(true);
  });
});

describe("money", () => {
  it("formats cents", () => {
    expect(formatMoney(123_456)).toBe("$1,234.56");
  });

  it("recognises currency codes", () => {
    expect(isCurrencyCode("EUR")).toBe(true);
    expect(isCurrencyCode("NOPE")).toBe(false);
  });
});

describe("plan limits", () => {
  it("blocks Free users at the limit and never blocks Pro", () => {
    expect(clientLimitMessage("FREE", 2)).toBeNull();
    expect(clientLimitMessage("FREE", 3)).toMatch(/3 active clients/);
    expect(invoiceLimitMessage("FREE", 5)).toMatch(/5 invoices/);
    expect(invoiceLimitMessage("PRO", 500)).toBeNull();
  });
});

describe("page queries", () => {
  it("reads filters and the first value of repeated params", () => {
    expect(readInvoiceQuery({ status: ["PAID", "SENT"], page: "3" })).toEqual({
      q: "",
      status: "PAID",
      page: 3,
      limit: 20,
    });
  });

  it("falls back to the first page on bad input", () => {
    expect(readClientQuery({ archived: "maybe", page: "2" })).toEqual({
      q: "",
      archived: "false",
      page: 1,
      limit: 20,
    });
  });

  it("builds hrefs without empty params or page 1", () => {
    expect(pageHref("/invoices", { q: "", status: "PAID" }, 1)).toBe("/invoices?status=PAID");
    expect(pageHref("/invoices", {}, 2)).toBe("/invoices?page=2");
  });
});

describe("parseSentryDsn", () => {
  it("builds the store URL", () => {
    expect(parseSentryDsn("https://abc123@o1.ingest.sentry.io/42")).toEqual({
      storeUrl: "https://o1.ingest.sentry.io/api/42/store/",
      publicKey: "abc123",
    });
  });

  it("ignores blank or malformed DSNs", () => {
    expect(parseSentryDsn("")).toBeNull();
    expect(parseSentryDsn("not a url")).toBeNull();
    expect(parseSentryDsn("https://o1.ingest.sentry.io/42")).toBeNull();
  });
});

describe("parseHundredths", () => {
  it("parses amounts, quantities and rates", async () => {
    const { parseHundredths, formatHundredths, formatQuantity } = await import("@/lib/money");
    expect(parseHundredths("95")).toBe(9_500);
    expect(parseHundredths("1.5")).toBe(150);
    expect(parseHundredths("1,250.05")).toBe(125_005);
    expect(parseHundredths(" 8.25 ")).toBe(825);
    expect(parseHundredths("1.234")).toBeNull();
    expect(parseHundredths("-1")).toBeNull();
    expect(parseHundredths("abc")).toBeNull();
    expect(formatHundredths(125_005)).toBe("1250.05");
    expect(formatHundredths(7)).toBe("0.07");
    expect([formatQuantity(250), formatQuantity(300), formatQuantity(825)]).toEqual(["2.5", "3", "8.25"]);
  });
});

describe("rate limit", () => {
  it("allows up to the limit per window, then resets", async () => {
    const { consume } = await import("@/lib/rate-limit");
    const start = 1_000_000;
    expect([1, 2, 3].map(() => consume("k", 2, start))).toEqual([true, true, false]);
    expect(consume("k", 2, start + 15 * 60 * 1000)).toBe(true);
  });
});

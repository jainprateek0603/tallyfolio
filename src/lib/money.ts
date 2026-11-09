export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/**
 * Parses a typed decimal ("95", "95.5", "1,250.00") into hundredths: cents for
 * money, hundredths for quantities, basis points for percentages. Null if invalid.
 */
export function parseHundredths(value: string): number | null {
  const cleaned = value.trim().replaceAll(",", "");
  const match = /^(\d{1,9})(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

/** The inverse of parseHundredths, for filling form inputs: 12345 -> "123.45". */
export function formatHundredths(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** A quantity in hundredths without trailing zeros: 250 -> "2.5", 300 -> "3". */
export function formatQuantity(hundredths: number): string {
  return formatHundredths(hundredths).replace(/\.?0+$/, "");
}

export function isCurrencyCode(code: string): boolean {
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: code }).format(0);
    return true;
  } catch {
    return false;
  }
}

export type LineInput = {
  quantityHundredths: number;
  unitCents: number;
};

export function lineTotalCents(quantityHundredths: number, unitCents: number): number {
  return Math.round((quantityHundredths * unitCents) / 100);
}

export function summarize(items: LineInput[], taxRateBps: number) {
  const subtotalCents = items.reduce(
    (sum, item) => sum + lineTotalCents(item.quantityHundredths, item.unitCents),
    0,
  );
  const taxCents = Math.round((subtotalCents * taxRateBps) / 10_000);
  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}

import { QuoteResult } from '../../../services/pricing-catalogs.service';

export type QuoteFormValues = {
  positionKey: string;
  quantity: string;
};

export function formatCents(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value / 100);
}

export function isValidNumber(value: string): boolean {
  return Number.isFinite(Number(value));
}

export function calculateTotalSurchargeCents(result: QuoteResult): number {
  return result.lines.reduce(
    (sum, line) =>
      sum +
      line.appliedSurcharges.reduce(
        (surchargeSum, surcharge) => surchargeSum + surcharge.amountCents,
        0,
      ),
    0,
  );
}

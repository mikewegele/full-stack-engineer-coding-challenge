export type QuoteRequestLine = {
  positionKey: string;
  quantity: number;
  appliedSurchargeKeys?: string[];
};

export type QuoteRequest = {
  lines: QuoteRequestLine[];
};

export type QuoteAppliedSurcharge = {
  key: string;
  label: string;
  amountCents: number;
};

export type QuoteAppliedDiscount = {
  key: string;
  label: string;
  amountCents: number;
};

export type QuoteLine = {
  positionKey: string;
  label: string;
  quantity: number;
  vatRate: string;
  netCents: number;
  grossCents: number;
  appliedSurcharges: QuoteAppliedSurcharge[];
  appliedDiscounts: QuoteAppliedDiscount[];
};

export type QuoteVatBreakdown = {
  vatRate: string;
  netCents: number;
  vatCents: number;
  grossCents: number;
};

export type QuoteTotals = {
  netCents: number;
  discountCents: number;
  vatCents: number;
  grossCents: number;
};

export type QuoteResult = {
  lines: QuoteLine[];
  vatBreakdown: QuoteVatBreakdown[];
  totals: QuoteTotals;
};

import {
  PricingCatalogPositionResponse,
  PricingCatalogVersionResponse,
  UpdatePricingCatalogPositionRequest,
} from '../../../services/pricing-catalogs.service';

export function findDraft(
  catalogs: PricingCatalogVersionResponse[],
): PricingCatalogVersionResponse | null {
  return catalogs.find((catalog) => catalog.status === 'DRAFT') ?? null;
}

export function findPublished(
  catalogs: PricingCatalogVersionResponse[],
): PricingCatalogVersionResponse | null {
  return catalogs.find((catalog) => catalog.status === 'PUBLISHED') ?? null;
}

export function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('de-DE').format(new Date(value));
}

export function formatCents(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value / 100);
}

export function formatVatRate(value: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function toOptionalNumber(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  return Number(value);
}

export function toUpdatePositionRequest(
  position: PricingCatalogPositionResponse,
): UpdatePricingCatalogPositionRequest {
  return {
    key: position.key,
    label: position.label,
    unit: position.unit,
    netPriceCents: position.netPriceCents,
    vatRate: Number(position.vatRate),
    minQuantity: toOptionalNumber(position.minQuantity),
    maxQuantity: toOptionalNumber(position.maxQuantity),
    attributes: position.attributes,
    surcharges: [],
  };
}

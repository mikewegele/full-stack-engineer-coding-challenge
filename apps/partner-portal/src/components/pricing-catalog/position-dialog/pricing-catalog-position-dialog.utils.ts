import { PricingSchemaField, PricingUnit } from '../../../services/pricing-catalogs.service';

export type PositionFormValues = {
  key: string;
  label: string;
  unit: PricingUnit;
  netPriceEuro: string;
  vatRate: string;
  minQuantity: string;
  maxQuantity: string;
  attributes: Record<string, string>;
};

export const pricingUnits: PricingUnit[] = ['piece', 'm2', 'meter', 'hour', 'flat'];

export function toCents(value: string): number {
  return Math.round(Number(value) * 100);
}

export function toOptionalNumber(value: string): number | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }

  return Number(value);
}

export function parseAttributeValue(field: PricingSchemaField, value: string): unknown {
  if (field.type === 'number') {
    return Number(value);
  }

  if (field.type === 'boolean') {
    return value === 'true';
  }

  return value;
}

export function isFieldVisible(field: PricingSchemaField, values: PositionFormValues): boolean {
  if (!field.dependsOn) {
    return true;
  }

  return values.attributes[field.dependsOn.field] === String(field.dependsOn.equals);
}

export function isValidNumber(value: string): boolean {
  return Number.isFinite(Number(value));
}

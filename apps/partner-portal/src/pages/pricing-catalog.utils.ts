import {
  PricingCatalogPositionResponse,
  PricingCatalogVersionResponse,
  PricingSchema,
  PricingSchemaField,
} from '../services/pricing-catalogs.service';

export type PricingCatalogTableRow = {
  key: string;
  label: string;
  unit: string;
  netPriceCents: number;
  vatRate: string;
  attributesSummary: string;
};

export type PricingSchemaFormField = {
  name: string;
  type: PricingSchemaField['type'];
  required: boolean;
  min?: number;
  max?: number;
  values?: string[];
  dependsOn?: PricingSchemaField['dependsOn'];
};

export function mapCatalogToTableRows(
  catalog: PricingCatalogVersionResponse,
): PricingCatalogTableRow[] {
  return catalog.positions.map((position) => mapPositionToTableRow(position));
}

export function mapPositionToTableRow(
  position: PricingCatalogPositionResponse,
): PricingCatalogTableRow {
  return {
    key: position.key,
    label: position.label,
    unit: position.unit,
    netPriceCents: position.netPriceCents,
    vatRate: position.vatRate,
    attributesSummary: formatAttributesSummary(position.attributes),
  };
}

export function mapSchemaToFormFields(schema: PricingSchema): PricingSchemaFormField[] {
  return schema.fields.map((field) => ({
    name: field.name,
    type: field.type,
    required: field.required ?? false,
    min: field.min,
    max: field.max,
    values: field.values,
    dependsOn: field.dependsOn,
  }));
}

export function formatAttributesSummary(attributes: Record<string, unknown>): string {
  const entries = Object.entries(attributes);

  if (entries.length === 0) {
    return '—';
  }

  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(', ');
}

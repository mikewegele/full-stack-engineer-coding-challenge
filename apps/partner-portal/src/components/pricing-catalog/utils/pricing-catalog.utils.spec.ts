import { describe, expect, it } from 'vitest';
import {
  PricingCatalogVersionResponse,
  PricingSchema,
} from '../../../services/pricing-catalogs.service';
import {
  formatAttributesSummary,
  mapCatalogToTableRows,
  mapSchemaToFormFields,
} from './pricing-catalog.utils';

describe('mapCatalogToTableRows', () => {
  it('maps backend catalog positions to table rows', () => {
    const catalog: PricingCatalogVersionResponse = {
      id: 'catalog-1',
      craftsmanId: 'craftsman-1',
      trade: 'hvac',
      status: 'DRAFT',
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      publishedByUserId: null,
      publishedAt: null,
      discounts: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      positions: [
        {
          id: 'position-1',
          key: 'position-1',
          label: 'Position 1',
          unit: 'piece',
          netPriceCents: 12500,
          vatRate: '0.19',
          minQuantity: '1',
          maxQuantity: '10',
          attributes: {
            heatingPowerKw: 12,
            inverterModel: 'Eco 2000',
          },
          surcharges: [],
        },
      ],
    };

    expect(mapCatalogToTableRows(catalog)).toEqual([
      {
        key: 'position-1',
        label: 'Position 1',
        unit: 'piece',
        netPriceCents: 12500,
        vatRate: '0.19',
        attributesSummary: 'heatingPowerKw: 12, inverterModel: Eco 2000',
      },
    ]);
  });
});

describe('mapSchemaToFormFields', () => {
  it('maps pricingSchema fields to form field definitions', () => {
    const schema: PricingSchema = {
      fields: [
        {
          name: 'heatingPowerKw',
          type: 'number',
          required: true,
          min: 1,
          max: 50,
        },
        {
          name: 'inverterModel',
          type: 'enum',
          values: ['Eco 1000', 'Eco 2000'],
        },
      ],
    };

    expect(mapSchemaToFormFields(schema)).toEqual([
      {
        name: 'heatingPowerKw',
        type: 'number',
        required: true,
        min: 1,
        max: 50,
        values: undefined,
        dependsOn: undefined,
      },
      {
        name: 'inverterModel',
        type: 'enum',
        required: false,
        min: undefined,
        max: undefined,
        values: ['Eco 1000', 'Eco 2000'],
        dependsOn: undefined,
      },
    ]);
  });
});

describe('formatAttributesSummary', () => {
  it('returns a dash for empty attributes', () => {
    expect(formatAttributesSummary({})).toBe('—');
  });

  it('formats attributes as comma-separated key value pairs', () => {
    expect(
      formatAttributesSummary({
        heatingPowerKw: 12,
        inverterModel: 'Eco 2000',
      }),
    ).toBe('heatingPowerKw: 12, inverterModel: Eco 2000');
  });
});

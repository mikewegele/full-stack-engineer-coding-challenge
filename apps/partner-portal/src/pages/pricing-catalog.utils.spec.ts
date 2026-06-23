import { describe, expect, it } from 'vitest';
import { PricingCatalogVersionResponse, PricingSchema } from '../services/pricing-catalogs.service';
import {
  formatAttributesSummary,
  mapCatalogToTableRows,
  mapSchemaToFormFields,
} from './pricing-catalog.utils';

describe('mapCatalogToTableRows', () => {
  it('maps backend catalog positions to table rows', () => {
    const catalog: PricingCatalogVersionResponse = {
      id: 'version-1',
      craftsmanId: 'craftsman-1',
      trade: 'HVAC',
      status: 'DRAFT',
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      publishedAt: null,
      positions: [
        {
          id: 'position-1',
          key: 'heat-pump',
          label: 'Heat pump',
          unit: 'piece',
          netPriceCents: 1200000,
          vatRate: '0.1900',
          minQuantity: '1.000',
          maxQuantity: '2.000',
          attributes: {
            heatingPowerKw: 12,
            inverterModel: 'A1',
          },
        },
      ],
    };

    expect(mapCatalogToTableRows(catalog)).toEqual([
      {
        key: 'heat-pump',
        label: 'Heat pump',
        unit: 'piece',
        netPriceCents: 1200000,
        vatRate: '0.1900',
        attributesSummary: 'heatingPowerKw: 12, inverterModel: A1',
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
          max: 20,
        },
        {
          name: 'frameMaterial',
          type: 'enum',
          values: ['wood', 'plastic'],
        },
      ],
    };

    expect(mapSchemaToFormFields(schema)).toEqual([
      {
        name: 'heatingPowerKw',
        type: 'number',
        required: true,
        min: 1,
        max: 20,
        values: undefined,
        dependsOn: undefined,
      },
      {
        name: 'frameMaterial',
        type: 'enum',
        required: false,
        min: undefined,
        max: undefined,
        values: ['wood', 'plastic'],
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
        inverterModel: 'A1',
      }),
    ).toBe('heatingPowerKw: 12, inverterModel: A1');
  });
});

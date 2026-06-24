import { BadRequestException } from '@nestjs/common';

import {
  PricingAdjustmentType,
  PricingCatalogStatus,
  PricingUnit,
} from '../entities/pricing-catalog.enums';
import { PricingCatalogDiscount } from '../entities/pricing-catalog-discount.entity';
import { PricingCatalogPosition } from '../entities/pricing-catalog-position.entity';
import { PricingCatalogSurcharge } from '../entities/pricing-catalog-surcharge.entity';
import { PricingCatalogVersion } from '../entities/pricing-catalog-version.entity';
import { calculateQuote } from './quote.calculator';

const now = new Date('2026-01-01T00:00:00.000Z');

const buildSurcharge = (
  overrides: Partial<PricingCatalogSurcharge> = {},
): PricingCatalogSurcharge =>
  ({
    id: 'surcharge-id',
    positionId: 'position-id',
    key: 'express',
    label: 'Express',
    type: PricingAdjustmentType.FLAT,
    amountCents: 1000,
    percentage: null,
    ...overrides,
  }) as PricingCatalogSurcharge;

const buildPosition = (overrides: Partial<PricingCatalogPosition> = {}): PricingCatalogPosition =>
  ({
    id: 'position-id',
    versionId: 'version-id',
    key: 'install',
    label: 'Installation',
    unit: PricingUnit.PIECE,
    netPriceCents: 10000,
    vatRate: '0.19',
    minQuantity: null,
    maxQuantity: null,
    attributes: {},
    surcharges: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }) as PricingCatalogPosition;

const buildDiscount = (overrides: Partial<PricingCatalogDiscount> = {}): PricingCatalogDiscount =>
  ({
    id: 'discount-id',
    versionId: 'version-id',
    key: 'discount',
    label: 'Discount',
    type: PricingAdjustmentType.FLAT,
    amountCents: 1000,
    percentage: null,
    capCents: null,
    appliesTo: 'subtotal',
    sortOrder: 0,
    ...overrides,
  }) as PricingCatalogDiscount;

const buildVersion = (overrides: Partial<PricingCatalogVersion> = {}): PricingCatalogVersion =>
  ({
    id: 'version-id',
    craftsmanId: 'craftsman-id',
    trade: 'HVAC',
    status: PricingCatalogStatus.PUBLISHED,
    effectiveFrom: now,
    publishedByUserId: 'admin-id',
    publishedAt: now,
    positions: [buildPosition()],
    discounts: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }) as PricingCatalogVersion;

describe('calculateQuote', () => {
  it('calculates a simple quote line with VAT totals', () => {
    const result = calculateQuote(buildVersion(), {
      lines: [
        {
          positionKey: 'install',
          quantity: 2,
        },
      ],
    });

    expect(result.lines).toEqual([
      expect.objectContaining({
        positionKey: 'install',
        quantity: 2,
        netCents: 20000,
        grossCents: 23800,
        appliedSurcharges: [],
        appliedDiscounts: [],
      }),
    ]);

    expect(result.vatBreakdown).toEqual([
      {
        vatRate: '0.19',
        netCents: 20000,
        vatCents: 3800,
        grossCents: 23800,
      },
    ]);

    expect(result.totals).toEqual({
      netCents: 20000,
      discountCents: 0,
      vatCents: 3800,
      grossCents: 23800,
    });
  });

  it('throws BadRequestException for an empty line list', () => {
    expect(() =>
      calculateQuote(buildVersion(), {
        lines: [],
      }),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException for an unknown position key', () => {
    expect(() =>
      calculateQuote(buildVersion(), {
        lines: [
          {
            positionKey: 'unknown',
            quantity: 1,
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException when quantity is below minQuantity', () => {
    const version = buildVersion({
      positions: [
        buildPosition({
          minQuantity: '2',
        }),
      ],
    });

    expect(() =>
      calculateQuote(version, {
        lines: [
          {
            positionKey: 'install',
            quantity: 1,
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException when quantity is above maxQuantity', () => {
    const version = buildVersion({
      positions: [
        buildPosition({
          maxQuantity: '2',
        }),
      ],
    });

    expect(() =>
      calculateQuote(version, {
        lines: [
          {
            positionKey: 'install',
            quantity: 3,
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException for an unknown surcharge key', () => {
    const version = buildVersion({
      positions: [
        buildPosition({
          surcharges: [buildSurcharge({ key: 'express' })],
        }),
      ],
    });

    expect(() =>
      calculateQuote(version, {
        lines: [
          {
            positionKey: 'install',
            quantity: 1,
            appliedSurchargeKeys: ['missing'],
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('applies flat surcharges', () => {
    const version = buildVersion({
      positions: [
        buildPosition({
          surcharges: [
            buildSurcharge({
              key: 'express',
              label: 'Express',
              type: PricingAdjustmentType.FLAT,
              amountCents: 2500,
              percentage: null,
            }),
          ],
        }),
      ],
    });

    const result = calculateQuote(version, {
      lines: [
        {
          positionKey: 'install',
          quantity: 2,
          appliedSurchargeKeys: ['express'],
        },
      ],
    });

    expect(result.lines[0]).toEqual(
      expect.objectContaining({
        netCents: 22500,
        grossCents: 26775,
        appliedSurcharges: [
          {
            key: 'express',
            label: 'Express',
            amountCents: 2500,
          },
        ],
      }),
    );
  });

  it('applies percentage surcharges multiplicatively', () => {
    const version = buildVersion({
      positions: [
        buildPosition({
          netPriceCents: 10000,
          surcharges: [
            buildSurcharge({
              key: 'difficult-access',
              label: 'Difficult access',
              type: PricingAdjustmentType.PERCENTAGE,
              amountCents: null,
              percentage: '0.1',
            }),
            buildSurcharge({
              key: 'weekend',
              label: 'Weekend',
              type: PricingAdjustmentType.PERCENTAGE,
              amountCents: null,
              percentage: '0.2',
            }),
          ],
        }),
      ],
    });

    const result = calculateQuote(version, {
      lines: [
        {
          positionKey: 'install',
          quantity: 1,
          appliedSurchargeKeys: ['difficult-access', 'weekend'],
        },
      ],
    });

    expect(result.lines[0].netCents).toBe(13200);
    expect(result.lines[0].grossCents).toBe(15708);
  });

  it('groups VAT by rate for mixed VAT quotes', () => {
    const version = buildVersion({
      positions: [
        buildPosition({
          key: 'install',
          label: 'Installation',
          netPriceCents: 10000,
          vatRate: '0.19',
        }),
        buildPosition({
          id: 'position-id-2',
          key: 'planning',
          label: 'Planning',
          netPriceCents: 5000,
          vatRate: '0.07',
        }),
      ],
    });

    const result = calculateQuote(version, {
      lines: [
        {
          positionKey: 'install',
          quantity: 1,
        },
        {
          positionKey: 'planning',
          quantity: 2,
        },
      ],
    });

    expect(result.vatBreakdown).toEqual(
      expect.arrayContaining([
        {
          vatRate: '0.19',
          netCents: 10000,
          vatCents: 1900,
          grossCents: 11900,
        },
        {
          vatRate: '0.07',
          netCents: 10000,
          vatCents: 700,
          grossCents: 10700,
        },
      ]),
    );

    expect(result.totals).toEqual({
      netCents: 20000,
      discountCents: 0,
      vatCents: 2600,
      grossCents: 22600,
    });
  });

  it('applies percentage discount with cap', () => {
    const version = buildVersion({
      positions: [
        buildPosition({
          netPriceCents: 100000,
        }),
      ],
      discounts: [
        buildDiscount({
          key: 'season',
          label: 'Season',
          type: PricingAdjustmentType.PERCENTAGE,
          amountCents: null,
          percentage: '0.2',
          capCents: 15000,
          appliesTo: 'subtotal',
          sortOrder: 0,
        }),
      ],
    });

    const result = calculateQuote(version, {
      lines: [
        {
          positionKey: 'install',
          quantity: 1,
        },
      ],
    });

    expect(result.lines[0].netCents).toBe(85000);
    expect(result.lines[0].appliedDiscounts).toEqual([
      {
        key: 'season',
        label: 'Season',
        amountCents: 15000,
      },
    ]);
    expect(result.totals.discountCents).toBe(15000);
  });

  it('applies stacked discounts in declaration order', () => {
    const version = buildVersion({
      positions: [
        buildPosition({
          netPriceCents: 100000,
        }),
      ],
      discounts: [
        buildDiscount({
          key: 'season',
          label: 'Season',
          type: PricingAdjustmentType.PERCENTAGE,
          amountCents: null,
          percentage: '0.2',
          capCents: 15000,
          appliesTo: 'subtotal',
          sortOrder: 0,
        }),
        buildDiscount({
          id: 'discount-id-2',
          key: 'loyalty',
          label: 'Loyalty',
          type: PricingAdjustmentType.PERCENTAGE,
          amountCents: null,
          percentage: '0.1',
          capCents: null,
          appliesTo: 'subtotal',
          sortOrder: 1,
        }),
        buildDiscount({
          id: 'discount-id-3',
          key: 'voucher',
          label: 'Voucher',
          type: PricingAdjustmentType.FLAT,
          amountCents: 5000,
          percentage: null,
          capCents: null,
          appliesTo: 'subtotal',
          sortOrder: 2,
        }),
      ],
    });

    const result = calculateQuote(version, {
      lines: [
        {
          positionKey: 'install',
          quantity: 1,
        },
      ],
    });

    expect(result.lines[0].netCents).toBe(71500);
    expect(result.totals.discountCents).toBe(28500);
    expect(result.lines[0].appliedDiscounts).toEqual([
      {
        key: 'season',
        label: 'Season',
        amountCents: 15000,
      },
      {
        key: 'loyalty',
        label: 'Loyalty',
        amountCents: 8500,
      },
      {
        key: 'voucher',
        label: 'Voucher',
        amountCents: 5000,
      },
    ]);
  });

  it('applies discounts only to configured position keys', () => {
    const version = buildVersion({
      positions: [
        buildPosition({
          key: 'install',
          label: 'Installation',
          netPriceCents: 10000,
          vatRate: '0.19',
        }),
        buildPosition({
          id: 'position-id-2',
          key: 'planning',
          label: 'Planning',
          netPriceCents: 10000,
          vatRate: '0.19',
        }),
      ],
      discounts: [
        buildDiscount({
          key: 'install-only',
          label: 'Install only',
          type: PricingAdjustmentType.FLAT,
          amountCents: 1000,
          appliesTo: {
            positionKeys: ['install'],
          },
        }),
      ],
    });

    const result = calculateQuote(version, {
      lines: [
        {
          positionKey: 'install',
          quantity: 1,
        },
        {
          positionKey: 'planning',
          quantity: 1,
        },
      ],
    });

    expect(result.lines.find((line) => line.positionKey === 'install')?.netCents).toBe(9000);
    expect(result.lines.find((line) => line.positionKey === 'planning')?.netCents).toBe(10000);
    expect(result.totals.discountCents).toBe(1000);
  });

  it('keeps zero-quantity lines when allowed', () => {
    const version = buildVersion({
      positions: [
        buildPosition({
          minQuantity: null,
          maxQuantity: null,
        }),
      ],
    });

    const result = calculateQuote(version, {
      lines: [
        {
          positionKey: 'install',
          quantity: 0,
        },
      ],
    });

    expect(result.lines[0]).toEqual(
      expect.objectContaining({
        quantity: 0,
        netCents: 0,
        grossCents: 0,
      }),
    );

    expect(result.totals).toEqual({
      netCents: 0,
      discountCents: 0,
      vatCents: 0,
      grossCents: 0,
    });
  });

  it('keeps VAT total equal to the sum of VAT breakdown entries', () => {
    const version = buildVersion({
      positions: [
        buildPosition({
          key: 'install',
          netPriceCents: 12345,
          vatRate: '0.19',
        }),
        buildPosition({
          id: 'position-id-2',
          key: 'planning',
          label: 'Planning',
          netPriceCents: 6789,
          vatRate: '0.07',
        }),
      ],
    });

    const result = calculateQuote(version, {
      lines: [
        {
          positionKey: 'install',
          quantity: 3,
        },
        {
          positionKey: 'planning',
          quantity: 4,
        },
      ],
    });

    const vatBreakdownSum = result.vatBreakdown.reduce(
      (sum, breakdown) => sum + breakdown.vatCents,
      0,
    );

    expect(result.totals.vatCents).toBe(vatBreakdownSum);
  });
});

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PricingAdjustmentType, PricingUnit } from '../entities/pricing-catalog.enums';
import { UpdatePricingCatalogDto } from './update-pricing-catalog.dto';

const validPosition = {
  key: 'installation',
  label: 'Installation',
  unit: PricingUnit.PIECE,
  netPriceCents: 10000,
  vatRate: 0.19,
};

const validFlatDiscount = {
  key: 'voucher',
  label: 'Voucher',
  type: PricingAdjustmentType.FLAT,
  amountCents: 1000,
  appliesTo: 'subtotal',
};

const validateDto = (input: Record<string, unknown>) =>
  validate(plainToInstance(UpdatePricingCatalogDto, input), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe('UpdatePricingCatalogDto', () => {
  it('accepts a valid flat discount applying to subtotal', async () => {
    const errors = await validateDto({
      positions: [validPosition],
      discounts: [validFlatDiscount],
    });

    expect(errors).toEqual([]);
  });

  it('accepts a percentage discount for selected positions', async () => {
    const errors = await validateDto({
      positions: [validPosition],
      discounts: [
        {
          key: 'season',
          label: 'Season',
          type: PricingAdjustmentType.PERCENTAGE,
          percentage: 0.1,
          capCents: 500,
          appliesTo: {
            positionKeys: ['installation'],
          },
        },
      ],
    });

    expect(errors).toEqual([]);
  });

  it('rejects invalid appliesTo values', async () => {
    const invalidValues: unknown[] = [
      'unknown',
      {},
      { positionKeys: [] },
      { positionKeys: ['installation', 'installation'] },
      { positionKeys: [''] },
      { positionKeys: ['installation'], extra: true },
    ];

    for (const appliesTo of invalidValues) {
      const errors = await validateDto({
        discounts: [
          {
            ...validFlatDiscount,
            appliesTo,
          },
        ],
      });

      expect(errors).not.toEqual([]);
    }
  });

  it('requires the value matching the adjustment type', async () => {
    const flatErrors = await validateDto({
      discounts: [
        {
          key: 'flat',
          label: 'Flat',
          type: PricingAdjustmentType.FLAT,
          appliesTo: 'subtotal',
        },
      ],
    });

    const percentageErrors = await validateDto({
      discounts: [
        {
          key: 'percentage',
          label: 'Percentage',
          type: PricingAdjustmentType.PERCENTAGE,
          appliesTo: 'subtotal',
        },
      ],
    });

    expect(flatErrors).not.toEqual([]);
    expect(percentageErrors).not.toEqual([]);
  });

  it('rejects conflicting adjustment values and negative amounts', async () => {
    const errors = await validateDto({
      discounts: [
        {
          ...validFlatDiscount,
          amountCents: -1,
          percentage: 0.1,
          capCents: 500,
        },
      ],
    });

    expect(errors).not.toEqual([]);
  });

  it('rejects minQuantity greater than maxQuantity', async () => {
    const errors = await validateDto({
      positions: [
        {
          ...validPosition,
          minQuantity: 5,
          maxQuantity: 2,
        },
      ],
    });

    expect(errors).not.toEqual([]);
  });

  it('rejects duplicate position, surcharge, and discount keys', async () => {
    const duplicatePositionErrors = await validateDto({
      positions: [
        validPosition,
        {
          ...validPosition,
          label: 'Duplicate',
        },
      ],
    });

    const duplicateSurchargeErrors = await validateDto({
      positions: [
        {
          ...validPosition,
          surcharges: [
            {
              key: 'express',
              label: 'Express',
              type: PricingAdjustmentType.FLAT,
              amountCents: 100,
            },
            {
              key: 'express',
              label: 'Express duplicate',
              type: PricingAdjustmentType.FLAT,
              amountCents: 200,
            },
          ],
        },
      ],
    });

    const duplicateDiscountErrors = await validateDto({
      discounts: [
        validFlatDiscount,
        {
          ...validFlatDiscount,
          label: 'Duplicate',
        },
      ],
    });

    expect(duplicatePositionErrors).not.toEqual([]);
    expect(duplicateSurchargeErrors).not.toEqual([]);
    expect(duplicateDiscountErrors).not.toEqual([]);
  });
});

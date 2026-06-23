import { BadRequestException } from '@nestjs/common';

import { PricingAdjustmentType } from '../entities/pricing-catalog.enums';
import { PricingCatalogDiscount } from '../entities/pricing-catalog-discount.entity';
import { PricingCatalogPosition } from '../entities/pricing-catalog-position.entity';
import { PricingCatalogSurcharge } from '../entities/pricing-catalog-surcharge.entity';
import { PricingCatalogVersion } from '../entities/pricing-catalog-version.entity';
import {
  QuoteAppliedSurcharge,
  QuoteLine,
  QuoteRequest,
  QuoteRequestLine,
  QuoteResult,
  QuoteVatBreakdown,
} from './quote.types';

export const calculateQuote = (
  version: PricingCatalogVersion,
  request: QuoteRequest,
): QuoteResult => {
  if (request.lines.length === 0) {
    throw new BadRequestException('Quote must contain at least one line');
  }

  const linesBeforeDiscounts = request.lines.map((requestLine) =>
    calculateLineBeforeDiscounts(version, requestLine),
  );

  const discountedLines = applyDiscounts(linesBeforeDiscounts, version.discounts ?? []);
  const lines = addLineGrossCents(discountedLines);
  const vatBreakdown = calculateVatBreakdown(lines);
  const totals = calculateTotals(lines, vatBreakdown);

  return {
    lines,
    vatBreakdown,
    totals,
  };
};

const calculateLineBeforeDiscounts = (
  version: PricingCatalogVersion,
  requestLine: QuoteRequestLine,
): QuoteLine => {
  const position = findPosition(version, requestLine.positionKey);

  validateQuantity(position, requestLine.quantity);

  const appliedSurcharges = findAppliedSurcharges(position, requestLine.appliedSurchargeKeys ?? []);
  const baseNetCents = Math.round(requestLine.quantity * position.netPriceCents);

  const flatSurchargeCents = appliedSurcharges
    .filter((surcharge) => surcharge.type === PricingAdjustmentType.FLAT)
    .reduce((sum, surcharge) => sum + (surcharge.amountCents ?? 0), 0);

  const netAfterFlatSurchargesCents = baseNetCents + flatSurchargeCents;

  const netAfterSurchargesCents = appliedSurcharges
    .filter((surcharge) => surcharge.type === PricingAdjustmentType.PERCENTAGE)
    .reduce((currentNetCents, surcharge) => {
      const percentage = Number(surcharge.percentage ?? 0);
      return Math.round(currentNetCents * (1 + percentage));
    }, netAfterFlatSurchargesCents);

  return {
    positionKey: position.key,
    label: position.label,
    quantity: requestLine.quantity,
    vatRate: position.vatRate,
    netCents: netAfterSurchargesCents,
    grossCents: netAfterSurchargesCents,
    appliedSurcharges: appliedSurcharges.map((surcharge) =>
      toAppliedSurcharge(surcharge, netAfterFlatSurchargesCents),
    ),
    appliedDiscounts: [],
  };
};

const applyDiscounts = (lines: QuoteLine[], discounts: PricingCatalogDiscount[]): QuoteLine[] => {
  let currentLines: QuoteLine[] = lines.map((line) => ({
    ...line,
    appliedDiscounts: [],
  }));

  discounts
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach((discount) => {
      const eligibleKeys = getEligiblePositionKeys(discount, currentLines);
      const eligibleLines = currentLines.filter((line) => eligibleKeys.includes(line.positionKey));
      const eligibleNetCents = eligibleLines.reduce((sum, line) => sum + line.netCents, 0);

      if (eligibleNetCents <= 0) {
        return;
      }

      const discountCents = calculateDiscountCents(discount, eligibleNetCents);

      if (discountCents <= 0) {
        return;
      }

      currentLines = distributeDiscount(currentLines, eligibleKeys, discount, discountCents);
    });
  return currentLines;
};

const addLineGrossCents = (lines: QuoteLine[]): QuoteLine[] => {
  return lines.map((line) => {
    const vatCents = Math.round(line.netCents * Number(line.vatRate));

    return {
      ...line,
      grossCents: line.netCents + vatCents,
    };
  });
};

const calculateVatBreakdown = (lines: QuoteLine[]): QuoteVatBreakdown[] => {
  const byVatRate = new Map<string, QuoteVatBreakdown>();

  lines.forEach((line) => {
    const existing = byVatRate.get(line.vatRate) ?? {
      vatRate: line.vatRate,
      netCents: 0,
      vatCents: 0,
      grossCents: 0,
    };

    existing.netCents += line.netCents;
    byVatRate.set(line.vatRate, existing);
  });

  Array.from(byVatRate.values()).forEach((breakdown) => {
    breakdown.vatCents = Math.round(breakdown.netCents * Number(breakdown.vatRate));
    breakdown.grossCents = breakdown.netCents + breakdown.vatCents;
  });

  return Array.from(byVatRate.values());
};

const calculateTotals = (lines: QuoteLine[], vatBreakdown: QuoteVatBreakdown[]) => {
  const netCents = lines.reduce((sum, line) => sum + line.netCents, 0);

  const discountCents = lines.reduce(
    (sum, line) =>
      sum +
      line.appliedDiscounts.reduce(
        (discountSum, discount) => discountSum + discount.amountCents,
        0,
      ),
    0,
  );

  const vatCents = vatBreakdown.reduce((sum, breakdown) => sum + breakdown.vatCents, 0);
  const grossCents = netCents + vatCents;

  return {
    netCents,
    discountCents,
    vatCents,
    grossCents,
  };
};

const findPosition = (
  version: PricingCatalogVersion,
  positionKey: string,
): PricingCatalogPosition => {
  const position = version.positions.find((catalogPosition) => catalogPosition.key === positionKey);

  if (!position) {
    throw new BadRequestException(`Unknown position key ${positionKey}`);
  }

  return position;
};

const validateQuantity = (position: PricingCatalogPosition, quantity: number): void => {
  const minQuantity = position.minQuantity !== null ? Number(position.minQuantity) : null;
  const maxQuantity = position.maxQuantity !== null ? Number(position.maxQuantity) : null;

  if (quantity < 0) {
    throw new BadRequestException(`Quantity for position ${position.key} must not be negative`);
  }

  if (minQuantity !== null && quantity < minQuantity) {
    throw new BadRequestException(
      `Quantity for position ${position.key} must be greater than or equal to ${minQuantity}`,
    );
  }

  if (maxQuantity !== null && quantity > maxQuantity) {
    throw new BadRequestException(
      `Quantity for position ${position.key} must be less than or equal to ${maxQuantity}`,
    );
  }
};

const findAppliedSurcharges = (
  position: PricingCatalogPosition,
  appliedSurchargeKeys: string[],
): PricingCatalogSurcharge[] => {
  return appliedSurchargeKeys.map((surchargeKey) => {
    const surcharge = position.surcharges.find(
      (catalogSurcharge) => catalogSurcharge.key === surchargeKey,
    );

    if (!surcharge) {
      throw new BadRequestException(
        `Unknown surcharge key ${surchargeKey} for position ${position.key}`,
      );
    }

    return surcharge;
  });
};

const toAppliedSurcharge = (
  surcharge: PricingCatalogSurcharge,
  netAfterFlatSurchargesCents: number,
): QuoteAppliedSurcharge => {
  if (surcharge.type === PricingAdjustmentType.FLAT) {
    return {
      key: surcharge.key,
      label: surcharge.label,
      amountCents: surcharge.amountCents ?? 0,
    };
  }

  const percentage = Number(surcharge.percentage ?? 0);

  return {
    key: surcharge.key,
    label: surcharge.label,
    amountCents: Math.round(netAfterFlatSurchargesCents * percentage),
  };
};

const getEligiblePositionKeys = (
  discount: PricingCatalogDiscount,
  lines: QuoteLine[],
): string[] => {
  if (discount.appliesTo === 'subtotal') {
    return lines.map((line) => line.positionKey);
  }

  return discount.appliesTo.positionKeys;
};

const calculateDiscountCents = (
  discount: PricingCatalogDiscount,
  eligibleNetCents: number,
): number => {
  let discountCents = 0;

  if (discount.type === PricingAdjustmentType.FLAT) {
    discountCents = discount.amountCents ?? 0;
  }

  if (discount.type === PricingAdjustmentType.PERCENTAGE) {
    const rawDiscountCents = Math.round(eligibleNetCents * Number(discount.percentage ?? 0));

    discountCents =
      discount.capCents !== null ? Math.min(rawDiscountCents, discount.capCents) : rawDiscountCents;
  }

  return Math.min(discountCents, eligibleNetCents);
};

const distributeDiscount = (
  lines: QuoteLine[],
  eligiblePositionKeys: string[],
  discount: PricingCatalogDiscount,
  discountCents: number,
): QuoteLine[] => {
  const eligibleLines = lines.filter((line) => eligiblePositionKeys.includes(line.positionKey));
  const eligibleNetCents = eligibleLines.reduce((sum, line) => sum + line.netCents, 0);

  let remainingDiscountCents = discountCents;

  return lines.map((line) => {
    if (!eligiblePositionKeys.includes(line.positionKey)) {
      return line;
    }

    const isLastEligibleLine =
      line.positionKey === eligibleLines[eligibleLines.length - 1].positionKey;

    const lineDiscountCents = isLastEligibleLine
      ? remainingDiscountCents
      : Math.round((line.netCents / eligibleNetCents) * discountCents);

    remainingDiscountCents -= lineDiscountCents;

    const newNetCents = line.netCents - lineDiscountCents;

    return {
      ...line,
      netCents: newNetCents,
      grossCents: newNetCents,
      appliedDiscounts: [
        ...line.appliedDiscounts,
        {
          key: discount.key,
          label: discount.label,
          amountCents: lineDiscountCents,
        },
      ],
    };
  });
};

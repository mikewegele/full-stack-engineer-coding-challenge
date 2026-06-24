import { ApiProperty } from '@nestjs/swagger';

import {
  PricingAdjustmentType,
  PricingCatalogStatus,
  PricingUnit,
} from '../entities/pricing-catalog.enums';
import {
  DiscountAppliesTo,
  PricingCatalogDiscount,
} from '../entities/pricing-catalog-discount.entity';
import { PricingCatalogPosition } from '../entities/pricing-catalog-position.entity';
import { PricingCatalogSurcharge } from '../entities/pricing-catalog-surcharge.entity';
import { PricingCatalogVersion } from '../entities/pricing-catalog-version.entity';

export class PricingCatalogSurchargeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ enum: PricingAdjustmentType })
  type: PricingAdjustmentType;

  @ApiProperty({ nullable: true })
  amountCents: number | null;

  @ApiProperty({ nullable: true })
  percentage: string | null;

  static from(entity: PricingCatalogSurcharge): PricingCatalogSurchargeResponseDto {
    return {
      id: entity.id,
      key: entity.key,
      label: entity.label,
      type: entity.type,
      amountCents: entity.amountCents,
      percentage: entity.percentage,
    };
  }
}

export class PricingCatalogPositionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ enum: PricingUnit })
  unit: PricingUnit;

  @ApiProperty()
  netPriceCents: number;

  @ApiProperty()
  vatRate: string;

  @ApiProperty({ nullable: true })
  minQuantity: string | null;

  @ApiProperty({ nullable: true })
  maxQuantity: string | null;

  @ApiProperty()
  attributes: Record<string, unknown>;

  @ApiProperty({ type: [PricingCatalogSurchargeResponseDto] })
  surcharges: PricingCatalogSurchargeResponseDto[];

  static from(entity: PricingCatalogPosition): PricingCatalogPositionResponseDto {
    return {
      id: entity.id,
      key: entity.key,
      label: entity.label,
      unit: entity.unit,
      netPriceCents: entity.netPriceCents,
      vatRate: entity.vatRate,
      minQuantity: entity.minQuantity,
      maxQuantity: entity.maxQuantity,
      attributes: entity.attributes,
      surcharges: (entity.surcharges ?? []).map(PricingCatalogSurchargeResponseDto.from),
    };
  }
}

export class PricingCatalogDiscountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ enum: PricingAdjustmentType })
  type: PricingAdjustmentType;

  @ApiProperty({ nullable: true })
  amountCents: number | null;

  @ApiProperty({ nullable: true })
  percentage: string | null;

  @ApiProperty({ nullable: true })
  capCents: number | null;

  @ApiProperty()
  appliesTo: DiscountAppliesTo;

  @ApiProperty()
  sortOrder: number;

  static from(entity: PricingCatalogDiscount): PricingCatalogDiscountResponseDto {
    return {
      id: entity.id,
      key: entity.key,
      label: entity.label,
      type: entity.type,
      amountCents: entity.amountCents,
      percentage: entity.percentage,
      capCents: entity.capCents,
      appliesTo: entity.appliesTo,
      sortOrder: entity.sortOrder,
    };
  }
}

export class PricingCatalogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  craftsmanId: string;

  @ApiProperty()
  trade: string;

  @ApiProperty({ enum: PricingCatalogStatus })
  status: PricingCatalogStatus;

  @ApiProperty()
  effectiveFrom: Date;

  @ApiProperty({ nullable: true })
  publishedByUserId: string | null;

  @ApiProperty({ nullable: true })
  publishedAt: Date | null;

  @ApiProperty({ type: [PricingCatalogPositionResponseDto] })
  positions: PricingCatalogPositionResponseDto[];

  @ApiProperty({ type: [PricingCatalogDiscountResponseDto] })
  discounts: PricingCatalogDiscountResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(entity: PricingCatalogVersion): PricingCatalogResponseDto {
    return {
      id: entity.id,
      craftsmanId: entity.craftsmanId,
      trade: entity.trade,
      status: entity.status,
      effectiveFrom: entity.effectiveFrom,
      publishedByUserId: entity.publishedByUserId,
      publishedAt: entity.publishedAt,
      positions: (entity.positions ?? []).map(PricingCatalogPositionResponseDto.from),
      discounts: (entity.discounts ?? []).map(PricingCatalogDiscountResponseDto.from),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

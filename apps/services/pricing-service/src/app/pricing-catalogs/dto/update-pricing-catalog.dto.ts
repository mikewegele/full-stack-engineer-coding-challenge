import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { PricingAdjustmentType, PricingUnit } from '../entities/pricing-catalog.enums';

class UpdatePricingCatalogSurchargeDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty({ enum: PricingAdjustmentType })
  @IsEnum(PricingAdjustmentType)
  type: PricingAdjustmentType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  amountCents?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  percentage?: number;
}

export class UpdatePricingCatalogPositionDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty({ enum: PricingUnit })
  @IsEnum(PricingUnit)
  unit: PricingUnit;

  @ApiProperty()
  @IsInt()
  @Min(0)
  netPriceCents: number;

  @ApiProperty()
  @IsNumber()
  vatRate: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minQuantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxQuantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiProperty({ required: false, type: [UpdatePricingCatalogSurchargeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePricingCatalogSurchargeDto)
  surcharges?: UpdatePricingCatalogSurchargeDto[];
}

class UpdatePricingCatalogDiscountDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty({ enum: PricingAdjustmentType })
  @IsEnum(PricingAdjustmentType)
  type: PricingAdjustmentType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  amountCents?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  percentage?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  capCents?: number;

  @ApiProperty()
  appliesTo: 'subtotal' | { positionKeys: string[] };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdatePricingCatalogDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiProperty({ required: false, type: [UpdatePricingCatalogPositionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePricingCatalogPositionDto)
  positions?: UpdatePricingCatalogPositionDto[];

  @ApiProperty({ required: false, type: [UpdatePricingCatalogDiscountDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePricingCatalogDiscountDto)
  discounts?: UpdatePricingCatalogDiscountDto[];
}

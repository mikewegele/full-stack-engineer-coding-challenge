import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsDefined,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { PricingAdjustmentType, PricingUnit } from '../entities/pricing-catalog.enums';

type DiscountAppliesTo =
  | 'subtotal'
  | {
      positionKeys: string[];
    };

interface AdjustmentInput {
  type?: PricingAdjustmentType;
  amountCents?: number;
  percentage?: number;
  capCents?: number;
}

@ValidatorConstraint({
  name: 'validPricingAdjustment',
  async: false,
})
class ValidPricingAdjustmentConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const adjustment = args.object as AdjustmentInput;

    if (adjustment.type === PricingAdjustmentType.FLAT) {
      return (
        Number.isInteger(adjustment.amountCents) &&
        (adjustment.amountCents ?? -1) >= 0 &&
        adjustment.percentage === undefined &&
        adjustment.capCents === undefined
      );
    }

    if (adjustment.type === PricingAdjustmentType.PERCENTAGE) {
      return (
        typeof adjustment.percentage === 'number' &&
        Number.isFinite(adjustment.percentage) &&
        adjustment.percentage >= 0 &&
        adjustment.amountCents === undefined
      );
    }

    return false;
  }

  defaultMessage(): string {
    return 'FLAT adjustments require only amountCents; PERCENTAGE adjustments require percentage and may define capCents';
  }
}

@ValidatorConstraint({
  name: 'validDiscountAppliesTo',
  async: false,
})
class ValidDiscountAppliesToConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === 'subtotal') {
      return true;
    }

    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const object = value as Record<string, unknown>;

    if (
      Object.keys(object).length !== 1 ||
      !Array.isArray(object.positionKeys) ||
      object.positionKeys.length === 0
    ) {
      return false;
    }

    const positionKeys = object.positionKeys;

    return (
      positionKeys.every((key) => typeof key === 'string' && key.trim().length > 0) &&
      new Set(positionKeys).size === positionKeys.length
    );
  }

  defaultMessage(): string {
    return 'appliesTo must be "subtotal" or an object containing a non-empty list of unique positionKeys';
  }
}

@ValidatorConstraint({
  name: 'validQuantityRange',
  async: false,
})
class ValidQuantityRangeConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const position = args.object as {
      minQuantity?: number;
      maxQuantity?: number;
    };

    if (position.minQuantity === undefined || position.maxQuantity === undefined) {
      return true;
    }

    return position.minQuantity <= position.maxQuantity;
  }

  defaultMessage(): string {
    return 'maxQuantity must be greater than or equal to minQuantity';
  }
}

class UpdatePricingCatalogSurchargeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ enum: PricingAdjustmentType })
  @IsEnum(PricingAdjustmentType)
  @Validate(ValidPricingAdjustmentConstraint)
  type: PricingAdjustmentType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  amountCents?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;
}

export class UpdatePricingCatalogPositionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
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
  @Min(0)
  @Max(1)
  vatRate: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Validate(ValidQuantityRangeConstraint)
  maxQuantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiProperty({
    required: false,
    type: [UpdatePricingCatalogSurchargeDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique((surcharge: UpdatePricingCatalogSurchargeDto) => surcharge.key)
  @ValidateNested({ each: true })
  @Type(() => UpdatePricingCatalogSurchargeDto)
  surcharges?: UpdatePricingCatalogSurchargeDto[];
}

class UpdatePricingCatalogDiscountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ enum: PricingAdjustmentType })
  @IsEnum(PricingAdjustmentType)
  @Validate(ValidPricingAdjustmentConstraint)
  type: PricingAdjustmentType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  amountCents?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  capCents?: number;

  @ApiProperty()
  @IsDefined()
  @Validate(ValidDiscountAppliesToConstraint)
  appliesTo: DiscountAppliesTo;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdatePricingCatalogDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiProperty({
    required: false,
    type: [UpdatePricingCatalogPositionDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique((position: UpdatePricingCatalogPositionDto) => position.key)
  @ValidateNested({ each: true })
  @Type(() => UpdatePricingCatalogPositionDto)
  positions?: UpdatePricingCatalogPositionDto[];

  @ApiProperty({
    required: false,
    type: [UpdatePricingCatalogDiscountDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique((discount: UpdatePricingCatalogDiscountDto) => discount.key)
  @ValidateNested({ each: true })
  @Type(() => UpdatePricingCatalogDiscountDto)
  discounts?: UpdatePricingCatalogDiscountDto[];
}

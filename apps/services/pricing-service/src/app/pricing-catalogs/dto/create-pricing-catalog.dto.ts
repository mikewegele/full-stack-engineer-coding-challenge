import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsUUID } from 'class-validator';
import { TRADE_CODES, TradeCode } from '@sandbox/types';

export class CreatePricingCatalogDto {
  @ApiProperty()
  @IsUUID()
  craftsmanId: string;

  @ApiProperty({ enum: TRADE_CODES })
  @IsIn(TRADE_CODES)
  trade: TradeCode;

  @ApiProperty()
  @IsDateString()
  effectiveFrom: string;
}

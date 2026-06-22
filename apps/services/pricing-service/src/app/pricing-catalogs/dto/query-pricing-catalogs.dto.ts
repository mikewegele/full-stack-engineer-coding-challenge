import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { TRADE_CODES, TradeCode } from '@sandbox/types';

export class QueryPricingCatalogsDto {
  @ApiProperty({ required: false, description: 'Filter by craftsman id' })
  @IsOptional()
  @IsUUID()
  craftsmanId?: string;

  @ApiProperty({ required: false, enum: TRADE_CODES })
  @IsOptional()
  @IsIn(TRADE_CODES)
  trade?: TradeCode;
}

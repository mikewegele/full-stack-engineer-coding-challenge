import { IsIn, IsOptional, IsString } from 'class-validator';
import { TRADE_CODES, TradeCode } from '@sandbox/types';

export class QueryPricingCatalogsDto {
  @IsOptional()
  @IsString()
  craftsmanId?: string;

  @IsOptional()
  @IsIn(TRADE_CODES)
  trade?: TradeCode;
}

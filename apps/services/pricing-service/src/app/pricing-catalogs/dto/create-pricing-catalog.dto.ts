import { IsDateString, IsIn, IsString } from 'class-validator';
import { TRADE_CODES, TradeCode } from '@sandbox/types';

export class CreatePricingCatalogDto {
  @IsString()
  craftsmanId: string;

  @IsIn(TRADE_CODES)
  trade: TradeCode;

  @IsDateString()
  effectiveFrom: string;
}

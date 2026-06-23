import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class UpdateTradeConfigDto {
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  pricingSchema?: Record<string, unknown>;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateTradeConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  pricingSchema?: Record<string, unknown>;
}

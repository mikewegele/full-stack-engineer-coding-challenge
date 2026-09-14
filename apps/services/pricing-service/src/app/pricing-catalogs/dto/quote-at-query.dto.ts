import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class QuoteAtQueryDto {
  @ApiPropertyOptional({
    description: 'ISO timestamp or "now" used to resolve the effective catalog version',
    example: '2026-03-01T12:00:00.000Z',
  })
  @Transform(({ value }) => (value === 'now' ? undefined : value))
  @IsOptional()
  @IsDateString()
  at?: string;
}

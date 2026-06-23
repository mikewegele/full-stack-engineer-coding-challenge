import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuoteRequestLineDto {
  @ApiProperty()
  @IsString()
  positionKey: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliedSurchargeKeys?: string[];
}

export class QuoteRequestDto {
  @ApiProperty({ type: [QuoteRequestLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteRequestLineDto)
  lines: QuoteRequestLineDto[];
}

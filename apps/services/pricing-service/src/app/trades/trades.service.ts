import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradeConfig } from './entities/trade-config.entity';
import { TradeConfigResponseDto } from './dto/trade-config-response.dto';
import { UpdateTradeConfigDto } from './dto/update-trade-config.dto';
import { PricingCatalogVersion } from '../pricing-catalogs/entities/pricing-catalog-version.entity';
import { validatePricingAttributes } from '../pricing-catalogs/schema/pricing-schema.validator';
import { PricingCatalogStatus } from '../pricing-catalogs/entities/pricing-catalog.enums';
import { PricingSchema } from '../pricing-catalogs/schema/pricing-schema.types';

@Injectable()
export class TradesService {
  constructor(
    @InjectRepository(TradeConfig)
    private readonly repo: Repository<TradeConfig>,
    @InjectRepository(PricingCatalogVersion)
    private readonly pricingCatalogVersions: Repository<PricingCatalogVersion>,
  ) {}
  async list(): Promise<TradeConfigResponseDto[]> {
    const items = await this.repo.find({ order: { trade: 'ASC' } });
    return items.map(TradeConfigResponseDto.from);
  }

  async findByCode(trade: string): Promise<TradeConfigResponseDto> {
    const found = await this.findEntityByCodeOrFail(trade);
    return TradeConfigResponseDto.from(found);
  }

  async updateTradeConfig(trade: string, dto: UpdateTradeConfigDto): Promise<TradeConfig> {
    const found = await this.findEntityByCodeOrFail(trade);
    if (dto.pricingSchema) {
      const pricingSchema = this.parsePricingSchema(dto.pricingSchema);
      await this.assertPricingSchemaCompatibleWithDrafts(trade, pricingSchema);
      found.pricingSchema = dto.pricingSchema;
    }
    return this.repo.save(found);
  }

  // ---------------------------------------------------------------------
  // Private helper methods
  // ---------------------------------------------------------------------

  private async findEntityByCodeOrFail(trade: string): Promise<TradeConfig> {
    const found = await this.repo.findOne({ where: { trade } });
    if (!found) {
      throw new NotFoundException(`Trade ${trade} not found`);
    }
    return found;
  }

  private async assertPricingSchemaCompatibleWithDrafts(
    trade: string,
    pricingSchema: PricingSchema,
  ): Promise<void> {
    const draftVersions = await this.pricingCatalogVersions.find({
      where: {
        trade,
        status: PricingCatalogStatus.DRAFT,
      },
      relations: ['positions'],
    });
    draftVersions.forEach((version) => {
      version.positions.forEach((position) => {
        const errors = validatePricingAttributes(pricingSchema, position.attributes ?? {});
        if (errors.length > 0) {
          throw new BadRequestException({
            message: `New pricing schema is incompatible with draft catalog ${version.id}`,
            positionKey: position.key,
            errors,
          });
        }
      });
    });
  }

  private parsePricingSchema(value: Record<string, unknown>): PricingSchema {
    if (!Array.isArray(value.fields)) {
      throw new BadRequestException('pricingSchema.fields must be an array');
    }
    return value as PricingSchema;
  }
}

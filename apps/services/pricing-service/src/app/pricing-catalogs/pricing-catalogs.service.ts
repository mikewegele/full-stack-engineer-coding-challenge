import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtPayload, UserRole } from '@sandbox/types';
import { FindOptionsWhere, Repository } from 'typeorm';

import { PricingCatalogResponseDto } from './dto/pricing-catalog-response.dto';
import { QueryPricingCatalogsDto } from './dto/query-pricing-catalogs.dto';
import { PricingCatalogVersion } from './entities/pricing-catalog-version.entity';
import { CreatePricingCatalogDto } from './dto/create-pricing-catalog.dto';
import { Craftsman } from '../craftsmen/entities/craftsman.entity';
import { CraftsmanTradeAssignment } from '../craftsmen/entities/craftsman-trade-assignment.entity';
import { PricingCatalogStatus } from './entities/pricing-catalog.enums';
import {
  UpdatePricingCatalogDto,
  UpdatePricingCatalogPositionDto,
} from './dto/update-pricing-catalog.dto';
import { PricingCatalogPosition } from './entities/pricing-catalog-position.entity';
import { PricingCatalogSurcharge } from './entities/pricing-catalog-surcharge.entity';
import { PricingCatalogDiscount } from './entities/pricing-catalog-discount.entity';
import { TradeConfig } from '../trades/entities/trade-config.entity';
import { PricingSchema } from './schema/pricing-schema.types';
import { validatePricingAttributes } from './schema/pricing-schema.validator';
import { calculateQuote } from './quote/quote.calculator';
import { QuoteResult } from './quote/quote.types';
import { QuoteRequestDto } from './dto/quote-request.dto';

@Injectable()
export class PricingCatalogsService {
  constructor(
    @InjectRepository(PricingCatalogVersion)
    private readonly versions: Repository<PricingCatalogVersion>,
    @InjectRepository(Craftsman)
    private readonly craftsmen: Repository<Craftsman>,
    @InjectRepository(CraftsmanTradeAssignment)
    private readonly assignments: Repository<CraftsmanTradeAssignment>,
    @InjectRepository(PricingCatalogPosition)
    private readonly positions: Repository<PricingCatalogPosition>,
    @InjectRepository(PricingCatalogSurcharge)
    private readonly surcharges: Repository<PricingCatalogSurcharge>,
    @InjectRepository(PricingCatalogDiscount)
    private readonly discounts: Repository<PricingCatalogDiscount>,
    @InjectRepository(TradeConfig)
    private readonly tradeConfigs: Repository<TradeConfig>,
  ) {}

  async list(
    query: QueryPricingCatalogsDto,
    user: JwtPayload,
  ): Promise<PricingCatalogResponseDto[]> {
    const qb = this.versions
      .createQueryBuilder('version')
      .leftJoinAndSelect('version.positions', 'position')
      .leftJoinAndSelect('position.surcharges', 'surcharge')
      .leftJoinAndSelect('version.discounts', 'discount');

    if (query.craftsmanId) {
      qb.andWhere('version.craftsmanId = :craftsmanId', {
        craftsmanId: query.craftsmanId,
      });
    }
    if (query.trade) {
      qb.andWhere('version.trade = :trade', { trade: query.trade });
    }

    if (this.isCraftsmanOnly(user)) {
      if (!user.craftsmanId) {
        return [];
      }
      qb.andWhere('version.craftsmanId = :userCraftsmanId', {
        userCraftsmanId: user.craftsmanId,
      });
    }

    const versions = await qb
      .orderBy('version.createdAt', 'DESC')
      .addOrderBy('position.key', 'ASC')
      .addOrderBy('discount.sortOrder', 'ASC')
      .getMany();

    return versions.map(PricingCatalogResponseDto.from);
  }

  async findOne(versionId: string, user: JwtPayload): Promise<PricingCatalogResponseDto> {
    const version = await this.findVersionEntityOrFail(versionId, user);
    return PricingCatalogResponseDto.from(version);
  }

  async quoteVersion(
    versionId: string,
    dto: QuoteRequestDto,
    user: JwtPayload,
  ): Promise<QuoteResult> {
    const version = await this.findVersionEntityOrFail(versionId, user);
    return calculateQuote(version, dto);
  }

  async create(dto: CreatePricingCatalogDto, user: JwtPayload): Promise<PricingCatalogResponseDto> {
    this.assertCanAccess(dto.craftsmanId, user);
    await this.assertCraftsmanIsActive(dto.craftsmanId);
    await this.assertCraftsmanIsAssignedToTrade(dto.craftsmanId, dto.trade);
    const version = this.versions.create({
      craftsmanId: dto.craftsmanId,
      trade: dto.trade,
      status: PricingCatalogStatus.DRAFT,
      effectiveFrom: new Date(dto.effectiveFrom),
      publishedByUserId: null,
      publishedAt: null,
      positions: [],
      discounts: [],
    });

    const saved = await this.versions.save(version);

    return PricingCatalogResponseDto.from({
      ...saved,
      positions: [],
      discounts: [],
    });
  }

  async updateDraft(
    versionId: string,
    dto: UpdatePricingCatalogDto,
    user: JwtPayload,
  ): Promise<PricingCatalogResponseDto> {
    const existing = await this.versions.findOne({
      where: { id: versionId },
      relations: {
        positions: {
          surcharges: true,
        },
        discounts: true,
      },
    });
    if (!existing) {
      throw new NotFoundException(`Pricing catalog ${versionId} not found`);
    }
    this.assertCanAccess(existing.craftsmanId, user);
    if (existing.status !== PricingCatalogStatus.DRAFT) {
      throw new BadRequestException('Only draft pricing catalogs can be updated');
    }
    if (dto.positions !== undefined) {
      await this.validatePositionAttributes(existing.trade, dto.positions);
    }

    Object.assign(existing, {
      ...(dto.effectiveFrom !== undefined && {
        effectiveFrom: new Date(dto.effectiveFrom),
      }),
      ...(dto.positions !== undefined && {
        positions: dto.positions.map((positionDto) =>
          this.positions.create({
            key: positionDto.key,
            label: positionDto.label,
            unit: positionDto.unit,
            netPriceCents: positionDto.netPriceCents,
            vatRate: String(positionDto.vatRate),
            minQuantity:
              positionDto.minQuantity !== undefined ? String(positionDto.minQuantity) : null,
            maxQuantity:
              positionDto.maxQuantity !== undefined ? String(positionDto.maxQuantity) : null,
            attributes: positionDto.attributes ?? {},
            surcharges: (positionDto.surcharges ?? []).map((surchargeDto) =>
              this.surcharges.create({
                key: surchargeDto.key,
                label: surchargeDto.label,
                type: surchargeDto.type,
                amountCents: surchargeDto.amountCents ?? null,
                percentage:
                  surchargeDto.percentage !== undefined ? String(surchargeDto.percentage) : null,
              }),
            ),
          }),
        ),
      }),
      ...(dto.discounts !== undefined && {
        discounts: dto.discounts.map((discountDto) =>
          this.discounts.create({
            key: discountDto.key,
            label: discountDto.label,
            type: discountDto.type,
            amountCents: discountDto.amountCents ?? null,
            percentage:
              discountDto.percentage !== undefined ? String(discountDto.percentage) : null,
            capCents: discountDto.capCents ?? null,
            appliesTo: discountDto.appliesTo,
            sortOrder: discountDto.sortOrder ?? 0,
          }),
        ),
      }),
    });

    const saved = await this.versions.save(existing);
    return PricingCatalogResponseDto.from(saved);
  }

  async publish(versionId: string, user: JwtPayload): Promise<PricingCatalogResponseDto> {
    const published = await this.versions.manager.transaction(async (manager) => {
      const version = await manager.findOne(PricingCatalogVersion, {
        where: { id: versionId },
        relations: ['positions', 'positions.surcharges', 'discounts'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!version) {
        throw new NotFoundException(`Pricing catalog version ${versionId} not found`);
      }
      this.assertCanAccess(version.craftsmanId, user);
      if (version.status !== PricingCatalogStatus.DRAFT) {
        throw new BadRequestException('Only draft pricing catalogs can be published');
      }
      const existingPublished = await manager.findOne(PricingCatalogVersion, {
        where: {
          craftsmanId: version.craftsmanId,
          trade: version.trade,
          status: PricingCatalogStatus.PUBLISHED,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (existingPublished) {
        throw new BadRequestException(
          `A published pricing catalog already exists for craftsman ${version.craftsmanId} and trade ${version.trade}`,
        );
      }
      version.status = PricingCatalogStatus.PUBLISHED;
      version.publishedAt = new Date();
      version.publishedByUserId = user.sub;
      return manager.save(PricingCatalogVersion, version);
    });

    return PricingCatalogResponseDto.from(published);
  }

  async quoteActiveVersion(
    id: string,
    trade: string,
    dto: QuoteRequestDto,
    user: JwtPayload,
  ): Promise<QuoteResult> {
    this.assertCanAccess(id, user);
    await this.assertCraftsmanIsActive(id);
    await this.assertCraftsmanIsAssignedToTrade(id, trade);
    const version = await this.findActivePublishedVersionOrFail(id, trade);
    return calculateQuote(version, dto);
  }

  // ---------------------------------------------------------------------
  // Private helper methods
  // ---------------------------------------------------------------------

  private async assertCraftsmanIsActive(craftsmanId: string): Promise<void> {
    const craftsman = await this.craftsmen.findOne({
      where: { id: craftsmanId },
    });
    if (!craftsman) {
      throw new NotFoundException(`Craftsman ${craftsmanId} not found`);
    }
    if (!craftsman.isActive) {
      throw new BadRequestException(`Craftsman ${craftsmanId} is inactive`);
    }
  }

  private async assertCraftsmanIsAssignedToTrade(
    craftsmanId: string,
    trade: string,
  ): Promise<void> {
    const assignment = await this.assignments.findOne({
      where: {
        craftsmanId,
        trade,
        isActive: true,
      },
    });
    if (!assignment) {
      throw new BadRequestException(`Craftsman ${craftsmanId} is not assigned to trade ${trade}`);
    }
  }

  private async findVersionEntityOrFail(
    versionId: string,
    user: JwtPayload,
  ): Promise<PricingCatalogVersion> {
    const version = await this.findVersionWithRelations({ id: versionId });
    if (!version) {
      throw new NotFoundException(`Pricing catalog version ${versionId} not found`);
    }
    this.assertCanAccess(version.craftsmanId, user);
    return version;
  }

  private async findActivePublishedVersionOrFail(
    craftsmanId: string,
    trade: string,
  ): Promise<PricingCatalogVersion> {
    const version = await this.findVersionWithRelations({
      craftsmanId,
      trade,
      status: PricingCatalogStatus.PUBLISHED,
    });
    if (!version) {
      throw new NotFoundException(
        `Active published pricing catalog for craftsman ${craftsmanId} and trade ${trade} not found`,
      );
    }
    return version;
  }

  private findVersionWithRelations(
    where: FindOptionsWhere<PricingCatalogVersion>,
  ): Promise<PricingCatalogVersion | null> {
    return this.versions.findOne({
      where,
      relations: ['positions', 'positions.surcharges', 'discounts'],
      order: {
        positions: {
          key: 'ASC',
        },
        discounts: {
          sortOrder: 'ASC',
        },
      },
    });
  }

  private async validatePositionAttributes(
    trade: string,
    positions: UpdatePricingCatalogPositionDto[],
  ): Promise<void> {
    const tradeConfig = await this.tradeConfigs.findOne({
      where: { trade },
    });

    if (!tradeConfig) {
      throw new BadRequestException(`Trade config for ${trade} not found`);
    }

    positions.forEach((position) => {
      const validationErrors = validatePricingAttributes(
        tradeConfig.pricingSchema as PricingSchema,
        position.attributes ?? {},
      );

      if (validationErrors.length > 0) {
        throw new BadRequestException({
          message: `Attributes for position ${position.key} are invalid`,
          errors: validationErrors,
        });
      }
    });
  }

  private isCraftsmanOnly(user: JwtPayload): boolean {
    return user.roles.includes(UserRole.CRAFTSMAN) && !user.roles.includes(UserRole.ADMIN);
  }

  private assertCanAccess(craftsmanId: string, user: JwtPayload): void {
    if (!this.isCraftsmanOnly(user)) {
      return;
    }

    if (user.craftsmanId !== craftsmanId) {
      throw new ForbiddenException('Craftsmen may only access their own pricing catalogs');
    }
  }
}

import {
  BadRequestException,
  ConflictException,
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
import { UpdatePricingCatalogDto, UpdatePricingCatalogPositionDto, } from './dto/update-pricing-catalog.dto';
import { PricingCatalogPosition } from './entities/pricing-catalog-position.entity';
import { PricingCatalogSurcharge } from './entities/pricing-catalog-surcharge.entity';
import { PricingCatalogDiscount } from './entities/pricing-catalog-discount.entity';
import { TradeConfig } from '../trades/entities/trade-config.entity';
import { PricingSchema } from './schema/pricing-schema.types';
import { validatePricingAttributes } from './schema/pricing-schema.validator';
import { calculateQuote } from './quote/quote.calculator';
import { QuoteResult } from './quote/quote.types';
import { QuoteRequestDto } from './dto/quote-request.dto';
import { QuoteIdempotencyRecord } from './entities/quote-idempotency-record.entity';
import { createHash } from 'node:crypto';

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
    @InjectRepository(QuoteIdempotencyRecord)
    private readonly idempotencyRecords: Repository<QuoteIdempotencyRecord>,
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
    idempotencyKey?: string,
  ): Promise<QuoteResult> {
    return this.executeIdempotentQuote(
      user.sub,
      idempotencyKey,
      `version:${versionId}`,
      dto,
      async () => {
        const version = await this.findVersionEntityOrFail(versionId, user);
        return calculateQuote(version, dto);
      },
    );
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
        lock: { mode: 'pessimistic_write' },
      });

      if (!version) {
        throw new NotFoundException(`Pricing catalog version ${versionId} not found`);
      }

      this.assertCanAccess(version.craftsmanId, user);

      if (version.status !== PricingCatalogStatus.DRAFT) {
        throw new BadRequestException('Only draft pricing catalogs can be published');
      }

      const assignment = await manager.findOne(CraftsmanTradeAssignment, {
        where: {
          craftsmanId: version.craftsmanId,
          trade: version.trade,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!assignment || !assignment.isActive) {
        throw new BadRequestException(
          `Craftsman ${version.craftsmanId} is not actively assigned to trade ${version.trade}`,
        );
      }

      const versionWithSameEffectiveFrom = await manager.findOne(PricingCatalogVersion, {
        where: {
          craftsmanId: version.craftsmanId,
          trade: version.trade,
          status: PricingCatalogStatus.PUBLISHED,
          effectiveFrom: version.effectiveFrom,
        },
      });

      if (versionWithSameEffectiveFrom) {
        throw new ConflictException(
          `A published pricing catalog with effectiveFrom ${version.effectiveFrom.toISOString()} already exists for craftsman ${version.craftsmanId} and trade ${version.trade}`,
        );
      }

      version.status = PricingCatalogStatus.PUBLISHED;
      version.publishedAt = new Date();
      version.publishedByUserId = user.sub;

      return manager.save(PricingCatalogVersion, version);
    });

    const reloaded = await this.findVersionWithRelations({ id: published.id });

    return PricingCatalogResponseDto.from(reloaded ?? published);
  }

  async quoteActiveVersion(
    id: string,
    trade: string,
    dto: QuoteRequestDto,
    user: JwtPayload,
    idempotencyKey?: string,
    at?: string,
  ): Promise<QuoteResult> {
    const quoteAt = this.resolveQuoteAt(at);
    const timeScope = at === undefined || at === 'now' ? 'now' : quoteAt.toISOString();

    return this.executeIdempotentQuote(
      user.sub,
      idempotencyKey,
      `active:${id}:${trade}:at:${timeScope}`,
      dto,
      async () => {
        this.assertCanAccess(id, user);
        await this.assertCraftsmanCanBeQuoted(id);
        await this.assertCraftsmanIsAssignedToTrade(id, trade);

        const version = await this.findPublishedVersionAtOrFail(id, trade, quoteAt);
        return calculateQuote(version, dto);
      },
    );
  }

  private resolveQuoteAt(at?: string): Date {
    if (at === undefined || at === 'now') {
      return new Date();
    }

    const parsed = new Date(at);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('at must be a valid ISO timestamp or "now"');
    }

    return parsed;
  }

  private async assertCraftsmanCanBeQuoted(craftsmanId: string): Promise<void> {
    const craftsman = await this.craftsmen.findOne({
      where: { id: craftsmanId },
    });

    if (!craftsman) {
      throw new NotFoundException(`Craftsman ${craftsmanId} not found`);
    }

    if (!craftsman.isActive) {
      throw new ForbiddenException(`Craftsman ${craftsmanId} is inactive`);
    }
  }

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

  private async findPublishedVersionAtOrFail(
    craftsmanId: string,
    trade: string,
    at: Date,
  ): Promise<PricingCatalogVersion> {
    const version = await this.versions
      .createQueryBuilder('version')
      .leftJoinAndSelect('version.positions', 'position')
      .leftJoinAndSelect('position.surcharges', 'surcharge')
      .leftJoinAndSelect('version.discounts', 'discount')
      .where('version.craftsmanId = :craftsmanId', { craftsmanId })
      .andWhere('version.trade = :trade', { trade })
      .andWhere('version.status = :status', {
        status: PricingCatalogStatus.PUBLISHED,
      })
      .andWhere('version.effectiveFrom <= :at', { at })
      .andWhere('version.publishedAt <= :at', { at })
      .orderBy('version.effectiveFrom', 'DESC')
      .addOrderBy('version.publishedAt', 'DESC')
      .addOrderBy('position.key', 'ASC')
      .addOrderBy('discount.sortOrder', 'ASC')
      .getOne();

    if (!version) {
      throw new NotFoundException(
        `Published pricing catalog for craftsman ${craftsmanId} and trade ${trade} at ${at.toISOString()} not found`,
      );
    }

    return version;
  }

  private findVersionWithRelations(
    where: FindOptionsWhere<PricingCatalogVersion>,
  ): Promise<PricingCatalogVersion | null> {
    return this.versions.findOne({
      where,
      relations: {
        positions: {
          surcharges: true,
        },
        discounts: true,
      },
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

  private async executeIdempotentQuote(
    userId: string,
    idempotencyKey: string | undefined,
    scope: string,
    dto: QuoteRequestDto,
    calculate: () => Promise<QuoteResult>,
  ): Promise<QuoteResult> {
    if (idempotencyKey === undefined) {
      return calculate();
    }

    if (idempotencyKey.trim().length === 0) {
      throw new BadRequestException('Idempotency-Key must not be empty');
    }

    if (idempotencyKey.length > 255) {
      throw new BadRequestException('Idempotency-Key must not exceed 255 characters');
    }

    const requestHash = createHash('sha256')
      .update(
        JSON.stringify(
          this.canonicalize({
            scope,
            body: dto,
          }),
        ),
      )
      .digest('hex');

    return this.idempotencyRecords.manager.transaction(async (manager) => {
      const records = manager.getRepository(QuoteIdempotencyRecord);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await records
        .createQueryBuilder()
        .insert()
        .into(QuoteIdempotencyRecord)
        .values({
          userId,
          idempotencyKey,
          requestHash,
          responseBody: null,
          expiresAt,
        })
        .orIgnore()
        .execute();

      const record = await records
        .createQueryBuilder('record')
        .setLock('pessimistic_write')
        .where('record.userId = :userId', { userId })
        .andWhere('record.idempotencyKey = :idempotencyKey', {
          idempotencyKey,
        })
        .getOneOrFail();

      const isExpired = record.expiresAt.getTime() <= now.getTime();

      if (!isExpired && record.requestHash !== requestHash) {
        throw new ConflictException('Idempotency-Key was already used with a different request');
      }

      if (!isExpired && record.responseBody !== null) {
        return JSON.parse(record.responseBody) as QuoteResult;
      }

      if (isExpired) {
        record.requestHash = requestHash;
        record.responseBody = null;
        record.expiresAt = expiresAt;
      }

      const result = await calculate();
      record.responseBody = JSON.stringify(result);
      await records.save(record);

      return result;
    });
  }

  private canonicalize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.canonicalize(item));
    }

    if (value !== null && typeof value === 'object') {
      const object = value as Record<string, unknown>;

      return Object.fromEntries(
        Object.keys(object)
          .filter((key) => object[key] !== undefined)
          .sort()
          .map((key) => [key, this.canonicalize(object[key])]),
      );
    }

    return value;
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

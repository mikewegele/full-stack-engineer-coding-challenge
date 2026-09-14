import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtPayload, UserRole } from '@sandbox/types';
import { ObjectLiteral, Repository } from 'typeorm';

import { Craftsman } from '../craftsmen/entities/craftsman.entity';
import { CraftsmanTradeAssignment } from '../craftsmen/entities/craftsman-trade-assignment.entity';
import { PricingCatalogResponseDto } from './dto/pricing-catalog-response.dto';
import {
  PricingAdjustmentType,
  PricingCatalogStatus,
  PricingUnit,
} from './entities/pricing-catalog.enums';
import { PricingCatalogVersion } from './entities/pricing-catalog-version.entity';
import { PricingCatalogsService } from './pricing-catalogs.service';
import { PricingCatalogPosition } from './entities/pricing-catalog-position.entity';
import { PricingCatalogSurcharge } from './entities/pricing-catalog-surcharge.entity';
import { PricingCatalogDiscount } from './entities/pricing-catalog-discount.entity';
import { TradeConfig } from '../trades/entities/trade-config.entity';
import { QuoteIdempotencyRecord } from './entities/quote-idempotency-record.entity';

type Repo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const adminUser: JwtPayload = {
  sub: 'admin-id',
  email: 'admin@example.com',
  roles: [UserRole.ADMIN],
  craftsmanId: null,
};

const craftsmanUser: JwtPayload = {
  sub: 'partner-user-id',
  email: 'partner@example.com',
  roles: [UserRole.CRAFTSMAN],
  craftsmanId: 'craftsman-a',
};

const otherCraftsmanUser: JwtPayload = {
  ...craftsmanUser,
  craftsmanId: 'craftsman-b',
};

let idempotencyRecords: {
  manager: {
    transaction: jest.Mock;
  };
};

let storedIdempotencyRecord: QuoteIdempotencyRecord | null;

function buildVersion(overrides: Partial<PricingCatalogVersion> = {}): PricingCatalogVersion {
  const now = new Date('2026-01-01T00:00:00.000Z');

  return {
    id: 'version-id',
    craftsmanId: 'craftsman-a',
    trade: 'HVAC',
    status: PricingCatalogStatus.DRAFT,
    effectiveFrom: now,
    publishedByUserId: null,
    publishedAt: null,
    positions: [],
    discounts: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as PricingCatalogVersion;
}

function buildCraftsman(overrides: Partial<Craftsman> = {}): Craftsman {
  const now = new Date('2026-01-01T00:00:00.000Z');

  return {
    id: 'craftsman-a',
    companyName: 'Test GmbH',
    email: null,
    phone: null,
    vatNumber: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    country: 'Germany',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    tradeAssignments: [],
    ...overrides,
  } as Craftsman;
}

function buildAssignment(
  overrides: Partial<CraftsmanTradeAssignment> = {},
): CraftsmanTradeAssignment {
  return {
    id: 'assignment-id',
    craftsmanId: 'craftsman-a',
    trade: 'HVAC',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    craftsman: buildCraftsman(),
    ...overrides,
  } as CraftsmanTradeAssignment;
}

function buildTradeConfig(overrides: Partial<TradeConfig> = {}): TradeConfig {
  const now = new Date('2026-01-01T00:00:00.000Z');

  return {
    id: 'trade-config-id',
    trade: 'HVAC',
    displayName: 'Heating',
    isActive: true,
    pricingSchema: { fields: [] },
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as TradeConfig;
}

describe('PricingCatalogsService', () => {
  let service: PricingCatalogsService;
  let repo: Repo<PricingCatalogVersion>;
  let craftsmen: Repo<Craftsman>;
  let assignments: Repo<CraftsmanTradeAssignment>;
  let positions: Repo<PricingCatalogPosition>;
  let surcharges: Repo<PricingCatalogSurcharge>;
  let discounts: Repo<PricingCatalogDiscount>;
  let tradeConfigs: Repo<TradeConfig>;
  let qb: { [key: string]: jest.Mock };

  beforeEach(() => {
    qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([buildVersion()]),
    };

    repo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((x: Partial<PricingCatalogVersion>) => x),
      save: jest.fn().mockImplementation((x: PricingCatalogVersion) =>
        Promise.resolve({
          ...x,
          id: x.id ?? 'version-id',
          createdAt: x.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: x.updatedAt ?? new Date('2026-01-01T00:00:00.000Z'),
        }),
      ),
    };

    craftsmen = {
      findOne: jest.fn(),
    };

    assignments = {
      findOne: jest.fn(),
    };

    positions = {
      create: jest.fn().mockImplementation((x: Partial<PricingCatalogPosition>) => x),
    };

    surcharges = {
      create: jest.fn().mockImplementation((x: Partial<PricingCatalogSurcharge>) => x),
    };

    discounts = {
      create: jest.fn().mockImplementation((x: Partial<PricingCatalogDiscount>) => x),
    };

    tradeConfigs = {
      findOne: jest.fn().mockResolvedValue(
        buildTradeConfig({
          pricingSchema: {
            fields: [
              {
                name: 'heatingPowerKw',
                type: 'number',
                required: true,
                min: 3,
                max: 20,
              },
            ],
          },
        }),
      ),
    };

    storedIdempotencyRecord = null;
    let insertedValues: Partial<QuoteIdempotencyRecord> = {};
    let queryBuilderCall = 0;

    const insertBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockImplementation((values: Partial<QuoteIdempotencyRecord>) => {
        insertedValues = values;
        return insertBuilder;
      }),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockImplementation(async () => {
        if (storedIdempotencyRecord === null) {
          storedIdempotencyRecord = {
            id: 'idempotency-record-id',
            ...insertedValues,
            createdAt: new Date(),
          } as QuoteIdempotencyRecord;
        }

        return {};
      }),
    };

    const selectBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOneOrFail: jest.fn().mockImplementation(async () => {
        if (storedIdempotencyRecord === null) {
          throw new Error('Idempotency record not found');
        }

        return storedIdempotencyRecord;
      }),
    };

    const transactionalRepository = {
      createQueryBuilder: jest.fn().mockImplementation(() => {
        queryBuilderCall += 1;
        return queryBuilderCall % 2 === 1 ? insertBuilder : selectBuilder;
      }),
      save: jest.fn().mockImplementation(async (record: QuoteIdempotencyRecord) => {
        storedIdempotencyRecord = record;
        return record;
      }),
    };

    idempotencyRecords = {
      manager: {
        transaction: jest
          .fn()
          .mockImplementation(
            async (callback: (manager: { getRepository: jest.Mock }) => Promise<unknown>) =>
              callback({
                getRepository: jest.fn().mockReturnValue(transactionalRepository),
              }),
          ),
      },
    };

    service = new PricingCatalogsService(
      repo as unknown as Repository<PricingCatalogVersion>,
      craftsmen as unknown as Repository<Craftsman>,
      assignments as unknown as Repository<CraftsmanTradeAssignment>,
      positions as unknown as Repository<PricingCatalogPosition>,
      surcharges as unknown as Repository<PricingCatalogSurcharge>,
      discounts as unknown as Repository<PricingCatalogDiscount>,
      tradeConfigs as unknown as Repository<TradeConfig>,
      idempotencyRecords as unknown as Repository<QuoteIdempotencyRecord>,
    );
  });

  describe('list', () => {
    it('returns pricing catalog versions for admin', async () => {
      const result = await service.list({}, adminUser);

      expect(result).toEqual([PricingCatalogResponseDto.from(buildVersion())]);
    });

    it('filters by craftsmanId when provided', async () => {
      await service.list({ craftsmanId: 'craftsman-a' }, adminUser);

      expect(qb.andWhere).toHaveBeenCalledWith('version.craftsmanId = :craftsmanId', {
        craftsmanId: 'craftsman-a',
      });
    });

    it('filters by trade when provided', async () => {
      await service.list({ trade: 'HVAC' }, adminUser);

      expect(qb.andWhere).toHaveBeenCalledWith('version.trade = :trade', {
        trade: 'HVAC',
      });
    });

    it('scopes CRAFTSMAN users to their own craftsmanId', async () => {
      await service.list({}, craftsmanUser);

      expect(qb.andWhere).toHaveBeenCalledWith('version.craftsmanId = :userCraftsmanId', {
        userCraftsmanId: 'craftsman-a',
      });
    });

    it('returns an empty list when CRAFTSMAN has no craftsmanId', async () => {
      const result = await service.list({}, { ...craftsmanUser, craftsmanId: null });

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns a pricing catalog version for admin', async () => {
      repo.findOne!.mockResolvedValue(buildVersion());

      const result = await service.findOne('version-id', adminUser);

      expect(result.id).toBe('version-id');
    });

    it('throws NotFoundException when version does not exist', async () => {
      repo.findOne!.mockResolvedValue(null);

      await expect(service.findOne('missing-id', adminUser)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when CRAFTSMAN reads another catalog', async () => {
      repo.findOne!.mockResolvedValue(buildVersion());

      await expect(service.findOne('version-id', otherCraftsmanUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('allows CRAFTSMAN to read their own catalog', async () => {
      repo.findOne!.mockResolvedValue(buildVersion());

      const result = await service.findOne('version-id', craftsmanUser);

      expect(result.id).toBe('version-id');
    });
  });

  describe('create', () => {
    it('creates a draft pricing catalog for admin', async () => {
      craftsmen.findOne!.mockResolvedValue(buildCraftsman());
      assignments.findOne!.mockResolvedValue(buildAssignment());

      const result = await service.create(
        {
          craftsmanId: 'craftsman-a',
          trade: 'HVAC',
          effectiveFrom: '2026-01-01T00:00:00.000Z',
        },
        adminUser,
      );

      expect(result.status).toBe(PricingCatalogStatus.DRAFT);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          craftsmanId: 'craftsman-a',
          trade: 'HVAC',
          status: PricingCatalogStatus.DRAFT,
          publishedByUserId: null,
          publishedAt: null,
          positions: [],
          discounts: [],
        }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('allows CRAFTSMAN to create a draft for their own craftsmanId', async () => {
      craftsmen.findOne!.mockResolvedValue(buildCraftsman());
      assignments.findOne!.mockResolvedValue(buildAssignment());

      const result = await service.create(
        {
          craftsmanId: 'craftsman-a',
          trade: 'HVAC',
          effectiveFrom: '2026-01-01T00:00:00.000Z',
        },
        craftsmanUser,
      );

      expect(result.craftsmanId).toBe('craftsman-a');
    });

    it('throws ForbiddenException when CRAFTSMAN creates for another craftsmanId', async () => {
      await expect(
        service.create(
          {
            craftsmanId: 'craftsman-a',
            trade: 'HVAC',
            effectiveFrom: '2026-01-01T00:00:00.000Z',
          },
          otherCraftsmanUser,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when craftsman does not exist', async () => {
      craftsmen.findOne!.mockResolvedValue(null);

      await expect(
        service.create(
          {
            craftsmanId: 'craftsman-a',
            trade: 'HVAC',
            effectiveFrom: '2026-01-01T00:00:00.000Z',
          },
          adminUser,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when craftsman is inactive', async () => {
      craftsmen.findOne!.mockResolvedValue(buildCraftsman({ isActive: false }));

      await expect(
        service.create(
          {
            craftsmanId: 'craftsman-a',
            trade: 'HVAC',
            effectiveFrom: '2026-01-01T00:00:00.000Z',
          },
          adminUser,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when craftsman is not assigned to the trade', async () => {
      craftsmen.findOne!.mockResolvedValue(buildCraftsman());
      assignments.findOne!.mockResolvedValue(null);

      await expect(
        service.create(
          {
            craftsmanId: 'craftsman-a',
            trade: 'HVAC',
            effectiveFrom: '2026-01-01T00:00:00.000Z',
          },
          adminUser,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateDraft', () => {
    it('updates a draft pricing catalog', async () => {
      repo.findOne!.mockResolvedValue(buildVersion());

      const result = await service.updateDraft(
        'version-id',
        {
          effectiveFrom: '2026-02-01T00:00:00.000Z',
          positions: [
            {
              key: 'heat-pump-installation',
              label: 'Heat pump installation',
              unit: PricingUnit.PIECE,
              netPriceCents: 120000,
              vatRate: 0.19,
              minQuantity: 1,
              maxQuantity: 2,
              attributes: {
                heatingPowerKw: 12,
              },
              surcharges: [
                {
                  key: 'express',
                  label: 'Express',
                  type: PricingAdjustmentType.FLAT,
                  amountCents: 5000,
                },
              ],
            },
          ],
          discounts: [
            {
              key: 'winter-discount',
              label: 'Winter discount',
              type: PricingAdjustmentType.PERCENTAGE,
              percentage: 0.1,
              capCents: 20000,
              appliesTo: 'subtotal',
              sortOrder: 1,
            },
          ],
        },
        adminUser,
      );

      expect(result.id).toBe('version-id');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          effectiveFrom: new Date('2026-02-01T00:00:00.000Z'),
          positions: [
            expect.objectContaining({
              key: 'heat-pump-installation',
              label: 'Heat pump installation',
              unit: PricingUnit.PIECE,
              netPriceCents: 120000,
              vatRate: '0.19',
              minQuantity: '1',
              maxQuantity: '2',
              attributes: {
                heatingPowerKw: 12,
              },
              surcharges: [
                expect.objectContaining({
                  key: 'express',
                  label: 'Express',
                  type: PricingAdjustmentType.FLAT,
                  amountCents: 5000,
                  percentage: null,
                }),
              ],
            }),
          ],
          discounts: [
            expect.objectContaining({
              key: 'winter-discount',
              label: 'Winter discount',
              type: PricingAdjustmentType.PERCENTAGE,
              amountCents: null,
              percentage: '0.1',
              capCents: 20000,
              appliesTo: 'subtotal',
              sortOrder: 1,
            }),
          ],
        }),
      );
    });

    it('allows CRAFTSMAN to update their own draft', async () => {
      repo.findOne!.mockResolvedValue(buildVersion());

      const result = await service.updateDraft(
        'version-id',
        {
          effectiveFrom: '2026-02-01T00:00:00.000Z',
        },
        craftsmanUser,
      );

      expect(result.id).toBe('version-id');
      expect(repo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when version does not exist', async () => {
      repo.findOne!.mockResolvedValue(null);

      await expect(
        service.updateDraft(
          'missing-id',
          {
            effectiveFrom: '2026-02-01T00:00:00.000Z',
          },
          adminUser,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when CRAFTSMAN updates another catalog', async () => {
      repo.findOne!.mockResolvedValue(buildVersion());

      await expect(
        service.updateDraft(
          'version-id',
          {
            effectiveFrom: '2026-02-01T00:00:00.000Z',
          },
          otherCraftsmanUser,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws BadRequestException when updating a published catalog', async () => {
      repo.findOne!.mockResolvedValue(
        buildVersion({
          status: PricingCatalogStatus.PUBLISHED,
          publishedAt: new Date('2026-01-01T00:00:00.000Z'),
          publishedByUserId: 'admin-id',
        }),
      );

      await expect(
        service.updateDraft(
          'version-id',
          {
            effectiveFrom: '2026-02-01T00:00:00.000Z',
          },
          adminUser,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when position attributes do not match the pricing schema', async () => {
      repo.findOne!.mockResolvedValue(buildVersion());

      tradeConfigs.findOne!.mockResolvedValue(
        buildTradeConfig({
          pricingSchema: {
            fields: [
              {
                name: 'heatingPowerKw',
                type: 'number',
                required: true,
                min: 3,
                max: 20,
              },
            ],
          },
        }),
      );

      await expect(
        service.updateDraft(
          'version-id',
          {
            positions: [
              {
                key: 'heat-pump-installation',
                label: 'Heat pump installation',
                unit: PricingUnit.PIECE,
                netPriceCents: 120000,
                vatRate: 0.19,
                attributes: {
                  heatingPowerKw: 30,
                },
              },
            ],
          },
          adminUser,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('keeps existing positions and discounts when they are omitted', async () => {
      const existing = buildVersion();

      const existingPosition = {
        id: 'position-id',
        versionId: 'version-id',
        version: existing,
        key: 'existing-position',
        label: 'Existing position',
        unit: PricingUnit.PIECE,
        netPriceCents: 10000,
        vatRate: '0.19',
        minQuantity: null,
        maxQuantity: null,
        attributes: {},
        surcharges: [],
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      } as PricingCatalogPosition;

      const existingDiscount = {
        id: 'discount-id',
        versionId: 'version-id',
        version: existing,
        key: 'existing-discount',
        label: 'Existing discount',
        type: PricingAdjustmentType.FLAT,
        amountCents: 1000,
        percentage: null,
        capCents: null,
        appliesTo: 'subtotal',
        sortOrder: 0,
      } as PricingCatalogDiscount;

      existing.positions = [existingPosition];
      existing.discounts = [existingDiscount];

      repo.findOne!.mockResolvedValue(existing);

      await service.updateDraft(
        'version-id',
        {
          effectiveFrom: '2026-02-01T00:00:00.000Z',
        },
        adminUser,
      );

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          positions: existing.positions,
          discounts: existing.discounts,
        }),
      );
    });
  });

  describe('publish', () => {
    let manager: {
      findOne: jest.Mock;
      save: jest.Mock;
    };

    beforeEach(() => {
      manager = {
        findOne: jest.fn(),
        save: jest.fn().mockImplementation((_entity, version: PricingCatalogVersion) =>
          Promise.resolve({
            ...version,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          }),
        ),
      };

      Object.assign(repo, {
        manager: {
          transaction: jest.fn().mockImplementation((callback) => callback(manager)),
        },
      });
    });

    it('publishes a draft pricing catalog', async () => {
      manager.findOne.mockResolvedValueOnce(buildVersion()).mockResolvedValueOnce(null);

      const result = await service.publish('version-id', adminUser);

      expect(result.status).toBe(PricingCatalogStatus.PUBLISHED);

      expect(manager.save).toHaveBeenCalledWith(
        PricingCatalogVersion,
        expect.objectContaining({
          id: 'version-id',
          status: PricingCatalogStatus.PUBLISHED,
          publishedByUserId: 'admin-id',
        }),
      );

      const savedVersion = manager.save.mock.calls[0][1] as PricingCatalogVersion;
      expect(savedVersion.publishedAt).toBeInstanceOf(Date);
    });

    it('throws NotFoundException when version does not exist', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(service.publish('missing-id', adminUser)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(manager.save).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when CRAFTSMAN publishes another catalog', async () => {
      manager.findOne.mockResolvedValueOnce(buildVersion());

      await expect(service.publish('version-id', otherCraftsmanUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(manager.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when version is already published', async () => {
      manager.findOne.mockResolvedValueOnce(
        buildVersion({
          status: PricingCatalogStatus.PUBLISHED,
          publishedAt: new Date('2026-01-01T00:00:00.000Z'),
          publishedByUserId: 'admin-id',
        }),
      );

      await expect(service.publish('version-id', adminUser)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(manager.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when another published version already exists', async () => {
      manager.findOne.mockResolvedValueOnce(buildVersion()).mockResolvedValueOnce(
        buildVersion({
          id: 'published-version-id',
          status: PricingCatalogStatus.PUBLISHED,
          publishedAt: new Date('2026-01-01T00:00:00.000Z'),
          publishedByUserId: 'admin-id',
        }),
      );

      await expect(service.publish('version-id', adminUser)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(manager.save).not.toHaveBeenCalled();
    });

    it('allows CRAFTSMAN to publish their own draft', async () => {
      manager.findOne.mockResolvedValueOnce(buildVersion()).mockResolvedValueOnce(null);

      const result = await service.publish('version-id', craftsmanUser);

      expect(result.status).toBe(PricingCatalogStatus.PUBLISHED);
      expect(manager.save).toHaveBeenCalled();
    });
  });

  describe('quote idempotency', () => {
    const prepareVersion = (): PricingCatalogVersion => {
      const version = buildVersion({
        status: PricingCatalogStatus.PUBLISHED,
      });

      version.positions = [
        {
          id: 'position-id',
          versionId: version.id,
          version,
          key: 'install',
          label: 'Installation',
          unit: PricingUnit.PIECE,
          netPriceCents: 10000,
          vatRate: '0.19',
          minQuantity: null,
          maxQuantity: null,
          attributes: {},
          surcharges: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        } as PricingCatalogPosition,
      ];

      return version;
    };

    it('returns the cached response for the same key and request', async () => {
      repo.findOne!.mockResolvedValue(prepareVersion());

      const request = {
        lines: [{ positionKey: 'install', quantity: 1 }],
      };

      const first = await service.quoteVersion('version-id', request, adminUser, 'same-key');

      const second = await service.quoteVersion('version-id', request, adminUser, 'same-key');

      expect(JSON.stringify(second)).toBe(JSON.stringify(first));
      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });

    it('rejects the same key with a different request', async () => {
      repo.findOne!.mockResolvedValue(prepareVersion());

      await service.quoteVersion(
        'version-id',
        {
          lines: [{ positionKey: 'install', quantity: 1 }],
        },
        adminUser,
        'reused-key',
      );

      await expect(
        service.quoteVersion(
          'version-id',
          {
            lines: [{ positionKey: 'install', quantity: 2 }],
          },
          adminUser,
          'reused-key',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows a key to be reused after expiration', async () => {
      repo.findOne!.mockResolvedValue(prepareVersion());

      await service.quoteVersion(
        'version-id',
        {
          lines: [{ positionKey: 'install', quantity: 1 }],
        },
        adminUser,
        'expired-key',
      );

      if (storedIdempotencyRecord === null) {
        throw new Error('Expected an idempotency record');
      }

      storedIdempotencyRecord.expiresAt = new Date(0);

      const result = await service.quoteVersion(
        'version-id',
        {
          lines: [{ positionKey: 'install', quantity: 2 }],
        },
        adminUser,
        'expired-key',
      );

      expect(result.totals.netCents).toBe(20000);
    });
  });

  describe('quoteActiveVersion', () => {
    it('quotes the active published catalog for a craftsman and trade', async () => {
      craftsmen.findOne!.mockResolvedValue(buildCraftsman());
      assignments.findOne!.mockResolvedValue(buildAssignment());
      const version = buildVersion({
        status: PricingCatalogStatus.PUBLISHED,
      });
      const position = {
        id: 'position-id',
        versionId: 'version-id',
        version,
        key: 'install',
        label: 'Installation',
        unit: PricingUnit.PIECE,
        netPriceCents: 10000,
        vatRate: '0.19',
        minQuantity: null,
        maxQuantity: null,
        attributes: {},
        surcharges: [],
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      } as PricingCatalogPosition;
      version.positions = [position];

      repo.findOne!.mockResolvedValue(version);
      const result = await service.quoteActiveVersion(
        'craftsman-a',
        'HVAC',
        {
          lines: [
            {
              positionKey: 'install',
              quantity: 2,
            },
          ],
        },
        adminUser,
      );

      expect(result.totals).toEqual({
        netCents: 20000,
        discountCents: 0,
        vatCents: 3800,
        grossCents: 23800,
      });
    });

    it('throws ForbiddenException when CRAFTSMAN quotes another craftsman', async () => {
      await expect(
        service.quoteActiveVersion(
          'craftsman-a',
          'HVAC',
          {
            lines: [
              {
                positionKey: 'install',
                quantity: 1,
              },
            ],
          },
          otherCraftsmanUser,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when craftsman does not exist', async () => {
      craftsmen.findOne!.mockResolvedValue(null);

      await expect(
        service.quoteActiveVersion(
          'craftsman-a',
          'HVAC',
          {
            lines: [
              {
                positionKey: 'install',
                quantity: 1,
              },
            ],
          },
          adminUser,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when craftsman is inactive', async () => {
      craftsmen.findOne!.mockResolvedValue(buildCraftsman({ isActive: false }));

      await expect(
        service.quoteActiveVersion(
          'craftsman-a',
          'HVAC',
          {
            lines: [
              {
                positionKey: 'install',
                quantity: 1,
              },
            ],
          },
          adminUser,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when craftsman is not assigned to the trade', async () => {
      craftsmen.findOne!.mockResolvedValue(buildCraftsman());
      assignments.findOne!.mockResolvedValue(null);

      await expect(
        service.quoteActiveVersion(
          'craftsman-a',
          'HVAC',
          {
            lines: [
              {
                positionKey: 'install',
                quantity: 1,
              },
            ],
          },
          adminUser,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when no active published catalog exists', async () => {
      craftsmen.findOne!.mockResolvedValue(buildCraftsman());
      assignments.findOne!.mockResolvedValue(buildAssignment());
      repo.findOne!.mockResolvedValue(null);

      await expect(
        service.quoteActiveVersion(
          'craftsman-a',
          'HVAC',
          {
            lines: [
              {
                positionKey: 'install',
                quantity: 1,
              },
            ],
          },
          adminUser,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

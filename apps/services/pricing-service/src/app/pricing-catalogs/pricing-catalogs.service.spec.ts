import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtPayload, UserRole } from '@sandbox/types';
import { ObjectLiteral, Repository } from 'typeorm';

import { Craftsman } from '../craftsmen/entities/craftsman.entity';
import { CraftsmanTradeAssignment } from '../craftsmen/entities/craftsman-trade-assignment.entity';
import { PricingCatalogResponseDto } from './dto/pricing-catalog-response.dto';
import { PricingCatalogStatus } from './entities/pricing-catalog.enums';
import { PricingCatalogVersion } from './entities/pricing-catalog-version.entity';
import { PricingCatalogsService } from './pricing-catalogs.service';

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

describe('PricingCatalogsService', () => {
  let service: PricingCatalogsService;
  let repo: Repo<PricingCatalogVersion>;
  let craftsmen: Repo<Craftsman>;
  let assignments: Repo<CraftsmanTradeAssignment>;
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

    service = new PricingCatalogsService(
      repo as unknown as Repository<PricingCatalogVersion>,
      craftsmen as unknown as Repository<Craftsman>,
      assignments as unknown as Repository<CraftsmanTradeAssignment>,
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
});

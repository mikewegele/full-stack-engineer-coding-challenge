import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtPayload, UserRole } from '@sandbox/types';
import { ObjectLiteral, Repository } from 'typeorm';

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

describe('PricingCatalogsService', () => {
  let service: PricingCatalogsService;
  let repo: Repo<PricingCatalogVersion>;
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
    };

    service = new PricingCatalogsService(repo as unknown as Repository<PricingCatalogVersion>);
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
});

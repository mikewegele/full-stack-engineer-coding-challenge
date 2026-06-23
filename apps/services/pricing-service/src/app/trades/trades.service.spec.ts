import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingCatalogStatus } from '../pricing-catalogs/entities/pricing-catalog.enums';
import { PricingCatalogVersion } from '../pricing-catalogs/entities/pricing-catalog-version.entity';
import { TradeConfig } from './entities/trade-config.entity';
import { TradesService } from './trades.service';

describe('TradesService', () => {
  let service: TradesService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let pricingCatalogVersions: {
    find: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    pricingCatalogVersions = {
      find: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TradesService,
        {
          provide: getRepositoryToken(TradeConfig),
          useValue: repo as Partial<Repository<TradeConfig>>,
        },
        {
          provide: getRepositoryToken(PricingCatalogVersion),
          useValue: pricingCatalogVersions as Partial<Repository<PricingCatalogVersion>>,
        },
      ],
    }).compile();

    service = moduleRef.get(TradesService);

    pricingCatalogVersions.find.mockResolvedValue([]);
  });

  it('list() returns mapped trade configs ordered by trade', async () => {
    repo.find.mockResolvedValue([
      buildTradeConfig({
        id: '1',
        trade: 'HVAC',
        displayName: 'Heating',
        isActive: true,
        metadata: {},
      }),
    ]);

    const result = await service.list();

    expect(repo.find).toHaveBeenCalledWith({ order: { trade: 'ASC' } });
    expect(result[0].trade).toBe('HVAC');
  });

  it('findByCode() returns one config', async () => {
    repo.findOne.mockResolvedValue(
      buildTradeConfig({
        id: '1',
        trade: 'HVAC',
        displayName: 'Heating',
        isActive: true,
        metadata: {},
      }),
    );

    const result = await service.findByCode('HVAC');

    expect(result.trade).toBe('HVAC');
  });

  it('findByCode() throws NotFoundException when trade is unknown', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.findByCode('UNKNOWN')).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('updateTradeConfig', () => {
    it('updates the pricing schema', async () => {
      repo.findOne.mockResolvedValue(buildTradeConfig());
      repo.save.mockImplementation((value) => Promise.resolve(value));
      pricingCatalogVersions.find.mockResolvedValue([]);

      const result = await service.updateTradeConfig('HVAC', {
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
      });

      expect(result.pricingSchema).toEqual({
        fields: [
          {
            name: 'heatingPowerKw',
            type: 'number',
            required: true,
            min: 3,
            max: 20,
          },
        ],
      });

      expect(repo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when trade does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.updateTradeConfig('UNKNOWN', {
          pricingSchema: {
            fields: [],
          },
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when pricingSchema.fields is missing', async () => {
      repo.findOne.mockResolvedValue(buildTradeConfig());

      await expect(
        service.updateTradeConfig('HVAC', {
          pricingSchema: {},
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when new schema is incompatible with existing draft positions', async () => {
      repo.findOne.mockResolvedValue(buildTradeConfig());

      pricingCatalogVersions.find.mockResolvedValue([
        {
          id: 'version-id',
          trade: 'HVAC',
          status: PricingCatalogStatus.DRAFT,
          positions: [
            {
              key: 'install',
              attributes: {
                heatingPowerKw: 2,
              },
            },
          ],
        },
      ]);

      await expect(
        service.updateTradeConfig('HVAC', {
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
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('does not check published catalog positions', async () => {
      repo.findOne.mockResolvedValue(buildTradeConfig());
      repo.save.mockImplementation((value) => Promise.resolve(value));

      pricingCatalogVersions.find.mockResolvedValue([]);

      await service.updateTradeConfig('HVAC', {
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
      });

      expect(pricingCatalogVersions.find).toHaveBeenCalledWith({
        where: {
          trade: 'HVAC',
          status: PricingCatalogStatus.DRAFT,
        },
        relations: ['positions'],
      });
    });
  });
});

function buildTradeConfig(overrides: Partial<TradeConfig> = {}): TradeConfig {
  return {
    id: 'trade-config-id',
    trade: 'HVAC',
    displayName: 'Heating',
    isActive: true,
    metadata: {},
    pricingSchema: {
      fields: [],
    },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as TradeConfig;
}

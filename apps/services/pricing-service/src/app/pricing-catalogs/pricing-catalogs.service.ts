import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtPayload, UserRole } from '@sandbox/types';
import { Repository } from 'typeorm';

import { PricingCatalogResponseDto } from './dto/pricing-catalog-response.dto';
import { QueryPricingCatalogsDto } from './dto/query-pricing-catalogs.dto';
import { PricingCatalogVersion } from './entities/pricing-catalog-version.entity';

@Injectable()
export class PricingCatalogsService {
  constructor(
    @InjectRepository(PricingCatalogVersion)
    private readonly versions: Repository<PricingCatalogVersion>,
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
    const version = await this.versions.findOne({
      where: { id: versionId },
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

    if (!version) {
      throw new NotFoundException(`Pricing catalog version ${versionId} not found`);
    }

    this.assertCanAccess(version.craftsmanId, user);
    return PricingCatalogResponseDto.from(version);
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

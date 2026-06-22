import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PricingCatalogVersion } from './entities/pricing-catalog-version.entity';
import { PricingCatalogPosition } from './entities/pricing-catalog-position.entity';
import { PricingCatalogSurcharge } from './entities/pricing-catalog-surcharge.entity';
import { PricingCatalogDiscount } from './entities/pricing-catalog-discount.entity';
import { PricingCatalogsController } from './pricing-catalogs.controller';
import { PricingCatalogsService } from './pricing-catalogs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PricingCatalogVersion,
      PricingCatalogPosition,
      PricingCatalogSurcharge,
      PricingCatalogDiscount,
    ]),
  ],
  controllers: [PricingCatalogsController],
  providers: [PricingCatalogsService],
  exports: [PricingCatalogsService],
})
export class PricingCatalogsModule {}

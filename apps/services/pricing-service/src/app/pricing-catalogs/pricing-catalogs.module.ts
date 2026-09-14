import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PricingCatalogVersion } from './entities/pricing-catalog-version.entity';
import { PricingCatalogPosition } from './entities/pricing-catalog-position.entity';
import { PricingCatalogSurcharge } from './entities/pricing-catalog-surcharge.entity';
import { PricingCatalogDiscount } from './entities/pricing-catalog-discount.entity';
import { PricingCatalogsController } from './pricing-catalogs.controller';
import { PricingCatalogsService } from './pricing-catalogs.service';
import { Craftsman } from '../craftsmen/entities/craftsman.entity';
import { CraftsmanTradeAssignment } from '../craftsmen/entities/craftsman-trade-assignment.entity';
import { TradeConfig } from '../trades/entities/trade-config.entity';
import { QuoteIdempotencyRecord } from './entities/quote-idempotency-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PricingCatalogVersion,
      PricingCatalogPosition,
      PricingCatalogSurcharge,
      PricingCatalogDiscount,
      Craftsman,
      CraftsmanTradeAssignment,
      TradeConfig,
      QuoteIdempotencyRecord,
    ]),
  ],
  controllers: [PricingCatalogsController],
  providers: [PricingCatalogsService],
  exports: [PricingCatalogsService],
})
export class PricingCatalogsModule {}

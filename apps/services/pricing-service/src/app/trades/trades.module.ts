import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradeConfig } from './entities/trade-config.entity';
import { TradesService } from './trades.service';
import { TradesController } from './trades.controller';
import { PricingCatalogVersion } from '../pricing-catalogs/entities/pricing-catalog-version.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TradeConfig, PricingCatalogVersion])],
  providers: [TradesService],
  controllers: [TradesController],
  exports: [TradesService],
})
export class TradesModule {}

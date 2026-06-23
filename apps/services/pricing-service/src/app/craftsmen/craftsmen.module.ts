import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Craftsman } from './entities/craftsman.entity';
import { CraftsmanTradeAssignment } from './entities/craftsman-trade-assignment.entity';
import { CraftsmenService } from './craftsmen.service';
import { CraftsmenController } from './craftsmen.controller';
import { PricingCatalogsService } from '../pricing-catalogs/pricing-catalogs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Craftsman, CraftsmanTradeAssignment])],
  providers: [CraftsmenService, PricingCatalogsService],
  controllers: [CraftsmenController],
  exports: [CraftsmenService],
})
export class CraftsmenModule {}

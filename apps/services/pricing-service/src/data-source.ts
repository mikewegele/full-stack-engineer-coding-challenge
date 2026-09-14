import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Craftsman } from './app/craftsmen/entities/craftsman.entity';
import { CraftsmanTradeAssignment } from './app/craftsmen/entities/craftsman-trade-assignment.entity';
import { TradeConfig } from './app/trades/entities/trade-config.entity';
import { PricingCatalogVersion } from './app/pricing-catalogs/entities/pricing-catalog-version.entity';
import { PricingCatalogPosition } from './app/pricing-catalogs/entities/pricing-catalog-position.entity';
import { PricingCatalogDiscount } from './app/pricing-catalogs/entities/pricing-catalog-discount.entity';
import { PricingCatalogSurcharge } from './app/pricing-catalogs/entities/pricing-catalog-surcharge.entity';
import { QuoteIdempotencyRecord } from './app/pricing-catalogs/entities/quote-idempotency-record.entity';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'pricing',
  schema: process.env.DATABASE_SCHEMA ?? 'pricing_service',
  entities: [
    Craftsman,
    CraftsmanTradeAssignment,
    TradeConfig,
    PricingCatalogVersion,
    PricingCatalogPosition,
    PricingCatalogDiscount,
    PricingCatalogSurcharge,
    QuoteIdempotencyRecord,
  ],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsRun: false,
  synchronize: false,
  logging: false,
};

export const AppDataSource = new DataSource(dataSourceOptions);

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PricingUnit } from './pricing-catalog.enums';
import { PricingCatalogSurcharge } from './pricing-catalog-surcharge.entity';
import { PricingCatalogVersion } from './pricing-catalog-version.entity';

@Entity({ schema: 'pricing_service', name: 'pricing_catalog_positions' })
@Index(['versionId', 'key'], { unique: true })
export class PricingCatalogPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'version_id', type: 'uuid' })
  versionId: string;

  @ManyToOne(() => PricingCatalogVersion, (version) => version.positions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'version_id' })
  version: PricingCatalogVersion;

  @Column({ type: 'varchar', length: 128 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'enum', enum: PricingUnit })
  unit: PricingUnit;

  @Column({ name: 'net_price_cents', type: 'integer' })
  netPriceCents: number;

  @Column({ name: 'vat_rate', type: 'numeric', precision: 5, scale: 4 })
  vatRate: string;

  @Column({ name: 'min_quantity', type: 'numeric', precision: 12, scale: 3, nullable: true })
  minQuantity: string | null;

  @Column({ name: 'max_quantity', type: 'numeric', precision: 12, scale: 3, nullable: true })
  maxQuantity: string | null;

  @Column({ type: 'jsonb', default: {} })
  attributes: Record<string, unknown>;

  @OneToMany(() => PricingCatalogSurcharge, (surcharge) => surcharge.position, {
    cascade: true,
  })
  surcharges: PricingCatalogSurcharge[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

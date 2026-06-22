import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PricingUnit } from './pricing-catalog.enums';
import { PricingCatalogVersion } from './pricing-catalog-version.entity';
import { PricingCatalogSurcharge } from './pricing-catalog-surcharge.entity';

@Entity({ schema: 'pricing_service', name: 'pricing_catalog_positions' })
@Index(['versionId', 'key'], { unique: true })
export class PricingCatalogPosition {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'version_id', type: 'uuid' })
  versionId!: string;

  @ManyToOne(() => PricingCatalogVersion, (version) => version.positions, {
    onDelete: 'CASCADE',
  })
  version!: PricingCatalogVersion;

  @Column({ name: 'key', type: 'varchar', length: 128 })
  key!: string;

  @Column({ name: 'label', type: 'varchar', length: 255 })
  label!: string;

  @Column({ name: 'unit', type: 'enum', enum: PricingUnit })
  unit!: PricingUnit;

  @Column({ name: 'net_price_cents', type: 'integer' })
  netPriceCents!: number;

  @Column({ name: 'vat_rate', type: 'numeric', precision: 5, scale: 4 })
  vatRate!: string;

  @Column({ name: 'min_quantity', type: 'numeric', precision: 12, scale: 3, nullable: true })
  minQuantity!: string | null;

  @Column({ name: 'max_quantity', type: 'numeric', precision: 12, scale: 3, nullable: true })
  maxQuantity!: string | null;

  @Column({ name: 'attributes', type: 'jsonb', default: {} })
  attributes!: Record<string, unknown>;

  @OneToMany(() => PricingCatalogSurcharge, (surcharge) => surcharge.position, {
    cascade: true,
  })
  surcharges!: PricingCatalogSurcharge[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

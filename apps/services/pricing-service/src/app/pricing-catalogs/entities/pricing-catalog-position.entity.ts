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
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  versionId!: string;

  @ManyToOne(() => PricingCatalogVersion, (version) => version.positions, {
    onDelete: 'CASCADE',
  })
  version!: PricingCatalogVersion;

  @Column({ type: 'varchar', length: 128 })
  key!: string;

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({ type: 'enum', enum: PricingUnit })
  unit!: PricingUnit;

  @Column({ type: 'integer' })
  netPriceCents!: number;

  @Column({ type: 'numeric', precision: 5, scale: 4 })
  vatRate!: string;

  @Column({ type: 'numeric', precision: 12, scale: 3, nullable: true })
  minQuantity!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, nullable: true })
  maxQuantity!: string | null;

  @Column({ type: 'jsonb', default: {} })
  attributes!: Record<string, unknown>;

  @OneToMany(() => PricingCatalogSurcharge, (surcharge) => surcharge.position, {
    cascade: true,
  })
  surcharges!: PricingCatalogSurcharge[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

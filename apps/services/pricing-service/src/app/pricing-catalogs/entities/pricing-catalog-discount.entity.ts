import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { PricingAdjustmentType } from './pricing-catalog.enums';
import { PricingCatalogVersion } from './pricing-catalog-version.entity';

export type DiscountAppliesTo = 'subtotal' | { positionKeys: string[] };

@Entity({ schema: 'pricing_service', name: 'pricing_catalog_discounts' })
@Index(['versionId', 'key'], { unique: true })
export class PricingCatalogDiscount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  versionId!: string;

  @ManyToOne(() => PricingCatalogVersion, (version) => version.discounts, {
    onDelete: 'CASCADE',
  })
  version!: PricingCatalogVersion;

  @Column({ type: 'varchar', length: 128 })
  key!: string;

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({ type: 'enum', enum: PricingAdjustmentType })
  type!: PricingAdjustmentType;

  @Column({ type: 'integer', nullable: true })
  amountCents!: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 4, nullable: true })
  percentage!: string | null;

  @Column({ type: 'integer', nullable: true })
  capCents!: number | null;

  @Column({ type: 'jsonb' })
  appliesTo!: DiscountAppliesTo;

  @Column({ type: 'integer', default: 0 })
  sortOrder!: number;
}

import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { PricingAdjustmentType } from './pricing-catalog.enums';
import { PricingCatalogVersion } from './pricing-catalog-version.entity';

export type DiscountAppliesTo = 'subtotal' | { positionKeys: string[] };

@Entity({ schema: 'pricing_service', name: 'pricing_catalog_discounts' })
export class PricingCatalogDiscount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'version_id', type: 'uuid' })
  versionId: string;

  @ManyToOne(() => PricingCatalogVersion, (version) => version.discounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'version_id' })
  version: PricingCatalogVersion;

  @Column({ type: 'varchar', length: 128 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'enum', enum: PricingAdjustmentType })
  type: PricingAdjustmentType;

  @Column({ name: 'amount_cents', type: 'integer', nullable: true })
  amountCents: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 4, nullable: true })
  percentage: string | null;

  @Column({ name: 'cap_cents', type: 'integer', nullable: true })
  capCents: number | null;

  @Column({ name: 'applies_to', type: 'jsonb' })
  appliesTo: DiscountAppliesTo;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;
}

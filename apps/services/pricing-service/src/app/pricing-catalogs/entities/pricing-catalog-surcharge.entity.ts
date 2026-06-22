import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { PricingAdjustmentType } from './pricing-catalog.enums';
import { PricingCatalogPosition } from './pricing-catalog-position.entity';

@Entity({ schema: 'pricing_service', name: 'pricing_catalog_surcharges' })
@Index(['positionId', 'key'], { unique: true })
export class PricingCatalogSurcharge {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'position_id', type: 'uuid' })
  positionId!: string;

  @ManyToOne(() => PricingCatalogPosition, (position) => position.surcharges, {
    onDelete: 'CASCADE',
  })
  position!: PricingCatalogPosition;

  @Column({ name: 'key', type: 'varchar', length: 128 })
  key!: string;

  @Column({ name: 'label', type: 'varchar', length: 255 })
  label!: string;

  @Column({ name: 'type', type: 'enum', enum: PricingAdjustmentType })
  type!: PricingAdjustmentType;

  @Column({ name: 'amount_cents', type: 'integer', nullable: true })
  amountCents!: number | null;

  @Column({ name: 'percentage', type: 'numeric', precision: 8, scale: 4, nullable: true })
  percentage!: string | null;
}

import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { PricingAdjustmentType } from './pricing-catalog.enums';
import { PricingCatalogPosition } from './pricing-catalog-position.entity';

@Entity({ schema: 'pricing_service', name: 'pricing_catalog_surcharges' })
@Index(['positionId', 'key'], { unique: true })
export class PricingCatalogSurcharge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  positionId!: string;

  @ManyToOne(() => PricingCatalogPosition, (position) => position.surcharges, {
    onDelete: 'CASCADE',
  })
  position!: PricingCatalogPosition;

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
}

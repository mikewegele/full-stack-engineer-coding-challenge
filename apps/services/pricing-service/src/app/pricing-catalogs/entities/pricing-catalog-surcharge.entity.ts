import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { PricingCatalogPosition } from './pricing-catalog-position.entity';
import { PricingAdjustmentType } from './pricing-catalog.enums';

@Entity({ schema: 'pricing_service', name: 'pricing_catalog_surcharges' })
export class PricingCatalogSurcharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'position_id', type: 'uuid' })
  positionId: string;

  @ManyToOne(() => PricingCatalogPosition, (position) => position.surcharges, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'position_id' })
  position: PricingCatalogPosition;

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
}

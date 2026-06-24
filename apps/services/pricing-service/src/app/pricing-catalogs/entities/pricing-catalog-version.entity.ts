import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PricingCatalogStatus } from './pricing-catalog.enums';
import { PricingCatalogDiscount } from './pricing-catalog-discount.entity';
import { PricingCatalogPosition } from './pricing-catalog-position.entity';

@Entity({ schema: 'pricing_service', name: 'pricing_catalog_versions' })
export class PricingCatalogVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'craftsman_id', type: 'uuid' })
  craftsmanId: string;

  @Column({ type: 'varchar', length: 64 })
  trade: string;

  @Column({
    type: 'enum',
    enum: PricingCatalogStatus,
    default: PricingCatalogStatus.DRAFT,
  })
  status: PricingCatalogStatus;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom: Date;

  @Column({ name: 'published_by_user_id', type: 'uuid', nullable: true })
  publishedByUserId: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @OneToMany(() => PricingCatalogPosition, (position) => position.version, {
    cascade: true,
  })
  positions: PricingCatalogPosition[];

  @OneToMany(() => PricingCatalogDiscount, (discount) => discount.version, {
    cascade: true,
  })
  discounts: PricingCatalogDiscount[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PricingCatalogStatus } from './pricing-catalog.enums';
import { PricingCatalogPosition } from './pricing-catalog-position.entity';
import { PricingCatalogDiscount } from './pricing-catalog-discount.entity';

@Entity({ schema: 'pricing_service', name: 'pricing_catalog_versions' })
export class PricingCatalogVersion {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'craftsman_id', type: 'uuid' })
  craftsmanId!: string;

  @Column({ name: 'trade', type: 'varchar', length: 64 })
  trade!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: PricingCatalogStatus,
    default: PricingCatalogStatus.DRAFT,
  })
  status!: PricingCatalogStatus;

  @Column({ name: 'effective_form', type: 'timestamptz' })
  effectiveFrom!: Date;

  @Column({ name: 'published_by_user_id', type: 'uuid', nullable: true })
  publishedByUserId!: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @OneToMany(() => PricingCatalogPosition, (position) => position.version, {
    cascade: true,
  })
  positions!: PricingCatalogPosition[];

  @OneToMany(() => PricingCatalogDiscount, (discount) => discount.version, {
    cascade: true,
  })
  discounts!: PricingCatalogDiscount[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

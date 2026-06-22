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
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  craftsmanId!: string;

  @Column({ type: 'varchar', length: 64 })
  trade!: string;

  @Column({
    type: 'enum',
    enum: PricingCatalogStatus,
    default: PricingCatalogStatus.DRAFT,
  })
  status!: PricingCatalogStatus;

  @Column({ type: 'timestamptz' })
  effectiveFrom!: Date;

  @Column({ type: 'uuid', nullable: true })
  publishedByUserId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @OneToMany(() => PricingCatalogPosition, (position) => position.version, {
    cascade: true,
  })
  positions!: PricingCatalogPosition[];

  @OneToMany(() => PricingCatalogDiscount, (discount) => discount.version, {
    cascade: true,
  })
  discounts!: PricingCatalogDiscount[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

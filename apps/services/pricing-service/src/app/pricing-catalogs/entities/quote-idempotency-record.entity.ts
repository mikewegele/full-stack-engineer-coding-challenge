import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  schema: 'pricing_service',
  name: 'quote_idempotency_records',
})
@Index(['userId', 'idempotencyKey'], { unique: true })
export class QuoteIdempotencyRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255 })
  idempotencyKey: string;

  @Column({ name: 'request_hash', type: 'varchar', length: 64 })
  requestHash: string;

  @Column({ name: 'response_body', type: 'text', nullable: true })
  responseBody: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

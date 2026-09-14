import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddQuoteIdempotency1782120000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'pricing_service.quote_idempotency_records',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'idempotency_key',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'request_hash',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'response_body',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
        uniques: [
          {
            name: 'uniq_quote_idempotency_user_key',
            columnNames: ['user_id', 'idempotency_key'],
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'pricing_service.quote_idempotency_records',
      new TableIndex({
        name: 'idx_quote_idempotency_expires_at',
        columnNames: ['expires_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('pricing_service.quote_idempotency_records', true);
  }
}

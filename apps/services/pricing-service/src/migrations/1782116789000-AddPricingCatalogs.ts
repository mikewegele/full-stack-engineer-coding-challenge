import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddPricingCatalogs1782116789000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'pricing_service.trade_configs',
      new TableColumn({
        name: 'pricing_schema',
        type: 'jsonb',
        default: "'{}'::jsonb",
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'pricing_service.pricing_catalog_versions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'craftsman_id', type: 'uuid' },
          { name: 'trade', type: 'varchar', length: '64' },
          { name: 'status', type: 'varchar', length: '32', default: "'DRAFT'" },
          { name: 'effective_from', type: 'timestamptz' },
          { name: 'published_by_user_id', type: 'uuid', isNullable: true },
          { name: 'published_at', type: 'timestamptz', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'pricing_service.pricing_catalog_versions',
      new TableForeignKey({
        columnNames: ['craftsman_id'],
        referencedTableName: 'pricing_service.craftsmen',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'pricing_service.pricing_catalog_versions',
      new TableIndex({
        name: 'idx_pricing_catalog_versions_craftsman_trade',
        columnNames: ['craftsman_id', 'trade'],
      }),
    );

    await queryRunner.createIndex(
      'pricing_service.pricing_catalog_versions',
      new TableIndex({
        name: 'idx_pricing_catalog_versions_status_effective',
        columnNames: ['status', 'effective_from'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'pricing_service.pricing_catalog_positions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'version_id', type: 'uuid' },
          { name: 'key', type: 'varchar', length: '128' },
          { name: 'label', type: 'varchar', length: '255' },
          { name: 'unit', type: 'varchar', length: '32' },
          { name: 'net_price_cents', type: 'integer' },
          { name: 'vat_rate', type: 'numeric', precision: 5, scale: 4 },
          { name: 'min_quantity', type: 'numeric', precision: 12, scale: 3, isNullable: true },
          { name: 'max_quantity', type: 'numeric', precision: 12, scale: 3, isNullable: true },
          { name: 'attributes', type: 'jsonb', default: "'{}'::jsonb" },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        uniques: [
          {
            name: 'uniq_pricing_catalog_position_key_per_version',
            columnNames: ['version_id', 'key'],
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'pricing_service.pricing_catalog_positions',
      new TableForeignKey({
        columnNames: ['version_id'],
        referencedTableName: 'pricing_service.pricing_catalog_versions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'pricing_service.pricing_catalog_surcharges',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'position_id', type: 'uuid' },
          { name: 'key', type: 'varchar', length: '128' },
          { name: 'label', type: 'varchar', length: '255' },
          { name: 'type', type: 'varchar', length: '32' },
          { name: 'amount_cents', type: 'integer', isNullable: true },
          { name: 'percentage', type: 'numeric', precision: 8, scale: 4, isNullable: true },
        ],
        uniques: [
          {
            name: 'uniq_pricing_catalog_surcharge_key_per_position',
            columnNames: ['position_id', 'key'],
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'pricing_service.pricing_catalog_surcharges',
      new TableForeignKey({
        columnNames: ['position_id'],
        referencedTableName: 'pricing_service.pricing_catalog_positions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'pricing_service.pricing_catalog_discounts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'version_id', type: 'uuid' },
          { name: 'key', type: 'varchar', length: '128' },
          { name: 'label', type: 'varchar', length: '255' },
          { name: 'type', type: 'varchar', length: '32' },
          { name: 'amount_cents', type: 'integer', isNullable: true },
          { name: 'percentage', type: 'numeric', precision: 8, scale: 4, isNullable: true },
          { name: 'cap_cents', type: 'integer', isNullable: true },
          { name: 'applies_to', type: 'jsonb' },
          { name: 'sort_order', type: 'integer', default: 0 },
        ],
        uniques: [
          {
            name: 'uniq_pricing_catalog_discount_key_per_version',
            columnNames: ['version_id', 'key'],
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'pricing_service.pricing_catalog_discounts',
      new TableForeignKey({
        columnNames: ['version_id'],
        referencedTableName: 'pricing_service.pricing_catalog_versions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'pricing_service.pricing_catalog_discounts',
      new TableIndex({
        name: 'idx_pricing_catalog_discounts_version_sort_order',
        columnNames: ['version_id', 'sort_order'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'pricing_service.pricing_catalog_discounts',
      'idx_pricing_catalog_discounts_version_sort_order',
    );
    await queryRunner.dropTable('pricing_service.pricing_catalog_discounts', true);
    await queryRunner.dropTable('pricing_service.pricing_catalog_surcharges', true);
    await queryRunner.dropTable('pricing_service.pricing_catalog_positions', true);

    await queryRunner.dropIndex(
      'pricing_service.pricing_catalog_versions',
      'idx_pricing_catalog_versions_status_effective',
    );
    await queryRunner.dropIndex(
      'pricing_service.pricing_catalog_versions',
      'idx_pricing_catalog_versions_craftsman_trade',
    );
    await queryRunner.dropTable('pricing_service.pricing_catalog_versions', true);

    await queryRunner.dropColumn('pricing_service.trade_configs', 'pricing_schema');
  }
}

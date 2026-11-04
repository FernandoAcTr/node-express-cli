import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class pushSubscriptions1677600000100 implements MigrationInterface {
  name = 'pushSubscriptions1677600000100'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'push_subscriptions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'endpoint',
            type: 'varchar',
            length: '500',
            isUnique: true,
          },
          {
            name: 'p256dh',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'auth',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'created_at',
            type: 'datetime(6)',
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'datetime(6)',
            default: 'CURRENT_TIMESTAMP(6)',
          },
        ],
      })
    )

    await queryRunner.createIndex(
      'push_subscriptions',
      new TableIndex({
        name: 'IDX_push_subscriptions_user',
        columnNames: ['user_id'],
      })
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('push_subscriptions')
  }
}

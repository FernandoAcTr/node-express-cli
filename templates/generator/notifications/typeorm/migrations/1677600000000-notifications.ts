import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class notifications1677600000000 implements MigrationInterface {
  name = 'notifications1677600000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'notifiable_id',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'notifiable_type',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'data',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'read_at',
            type: 'datetime',
            isNullable: true,
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
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_notifiable_read',
        columnNames: ['notifiable_id', 'read_at'],
      })
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notifications')
  }
}

import { MigrationInterface, QueryRunner, Table } from 'typeorm'

export class Seeds0000000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'seeds',
        columns: [
          {
            name: 'id',
            type: 'varchar(50)',
            isPrimary: true,
            isGenerated: false,
          },
          {
            name: 'created_at',
            type: 'datetime(6)',
            default: 'CURRENT_TIMESTAMP(6)',
          },
        ],
      })
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

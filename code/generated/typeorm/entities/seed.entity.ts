import { BaseEntity, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'

@Entity('seeds')
export class Seed extends BaseEntity {
  @PrimaryColumn()
  id: string

  @CreateDateColumn()
  created_at: Date
}

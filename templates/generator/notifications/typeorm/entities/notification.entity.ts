import { BaseEntity, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('notifications')
@Index(['notifiable_id', 'read_at'])
export class Notification extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  notifiable_id: string

  @Column()
  notifiable_type: string

  @Column()
  type: string

  @Column({ type: 'json', nullable: true })
  data: Record<string, unknown> | null

  @Column({ type: 'datetime', nullable: true })
  read_at: Date | null

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}

import { BaseEntity, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('push_subscriptions')
@Index(['user_id'])
export class PushSubscription extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  user_id: string

  @Column({ type: 'varchar', length: 500, unique: true })
  endpoint: string

  @Column()
  p256dh: string

  @Column()
  auth: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}

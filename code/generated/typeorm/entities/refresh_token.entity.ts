import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm'
import { User } from './user.entity'

@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  refresh_token: string

  @Column()
  user_id: number

  @OneToOne(() => User, (user) => user.refresh_token)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: User

  @Column()
  expires_at: Date
  
  @CreateDateColumn()
  created_at: Date
}

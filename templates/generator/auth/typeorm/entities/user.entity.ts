import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  BaseEntity,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm'
import { Role } from './role.entity'

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 100, unique: true })
  email: string

  @Column({ length: 72 })
  password: string

  @Column()
  name: string

  @Column()
  role_id: number

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id', referencedColumnName: 'id' })
  role: Role

  toJSON(): any {
    const { password, ...other } = this as any
    return other
  }
}

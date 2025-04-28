import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, JoinColumn, ManyToOne } from 'typeorm'
import { DateTimeAuditableEntity } from './audit/date_time_auditable_entity'
import { Verifiable } from './verifiable'
import { Role } from './role.entity'
import { Mixin } from 'ts-mixer'

@Entity()
export class User extends Mixin(DateTimeAuditableEntity, Verifiable) {
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

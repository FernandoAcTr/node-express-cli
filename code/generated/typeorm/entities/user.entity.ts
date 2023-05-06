import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, BaseEntity } from 'typeorm';

@Entity()
export class User extends BaseEntity{
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 100, unique: true })
  email: string

  @Column({ length: 72 })
  password: string

  @Column()
  name: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  toJSON(): any {
    const { password, ...other } = this as any
    return other
  }
}

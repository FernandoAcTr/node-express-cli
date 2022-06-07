import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  usuario_id: string

  @Column({ length: 100, unique: true })
  email: string

  @Column({ length: 72 })
  password: string

  @Column()
  name: string

  toJSON(): any {
    const { password, ...other } = this as any
    return other
  }
}

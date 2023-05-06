import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('roles')
export class Role extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string
}

export enum Roles {
  ADMIN = 1,
  USER = 2,
}

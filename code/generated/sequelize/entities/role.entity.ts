import { sequelize } from '@/database/datasources'
import { CreationOptional, InferAttributes, InferCreationAttributes, Model, DataTypes } from 'sequelize'

export class Role extends Model<InferAttributes<Role>, InferCreationAttributes<Role>> {
  declare id: CreationOptional<number>
  declare name: string
}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
    },
  },
  { sequelize, timestamps: false }
)

export enum Roles {
  ADMIN = 1,
  USER = 2,
}

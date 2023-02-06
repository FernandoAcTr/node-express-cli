import { sequelize } from '@database/datasources'
import { CreationOptional, InferAttributes, InferCreationAttributes, Model, DataTypes } from 'sequelize'

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare user_id: CreationOptional<number>
  declare name: string
  declare email: string
  declare password: string
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  toJSON(): any {
    const { password, ...other } = this as any
    return other
  }
}

User.init(
  {
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'users' }
)
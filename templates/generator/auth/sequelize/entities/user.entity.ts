import { sequelize } from '@/database/datasources'
import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Model,
  DataTypes,
  ForeignKey,
  NonAttribute,
} from 'sequelize'
import { Role } from './role.entity'
import { RefreshToken } from './refresh_token.entity'

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>
  declare name: string
  declare email: string
  declare password: string
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  declare role_id: ForeignKey<number>
  declare role: NonAttribute<Role>
  declare token: NonAttribute<RefreshToken>
}

User.init(
  {
    id: {
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
    role_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: { model: Role, key: 'id' },
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'users' }
)

User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' })
User.hasOne(RefreshToken, { foreignKey: 'id', as: 'refreshToken' })
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

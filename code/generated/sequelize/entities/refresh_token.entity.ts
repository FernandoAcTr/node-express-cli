import { sequelize } from '@/database/datasources'
import { CreationOptional, InferAttributes, InferCreationAttributes, Model, DataTypes, ForeignKey, NonAttribute } from 'sequelize'
import { User } from './user.entity'

export class RefreshToken extends Model<InferAttributes<RefreshToken>, InferCreationAttributes<RefreshToken>> {
  declare id: CreationOptional<number>
  declare refresh_token: string
  declare user_id: ForeignKey<number>
  declare user: NonAttribute<User>
  declare createdAt: CreationOptional<Date>
  declare expiresAt: Date
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    refresh_token: {
      type: DataTypes.STRING,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: { model: User, key: 'id' },
    },
    createdAt: DataTypes.DATE,
    expiresAt: DataTypes.DATE,
  },
  { sequelize, createdAt: true, updatedAt: true }
)

RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' })


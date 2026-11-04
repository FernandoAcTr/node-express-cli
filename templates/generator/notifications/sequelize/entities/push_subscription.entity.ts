import { sequelize } from '@/database/datasources'
import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

export class PushSubscription extends Model<InferAttributes<PushSubscription>, InferCreationAttributes<PushSubscription>> {
  declare id: CreationOptional<string>
  declare userId: string
  declare endpoint: string
  declare p256dh: string
  declare auth: string
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

PushSubscription.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    endpoint: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
    },
    p256dh: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    auth: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'push_subscriptions', underscored: true }
)

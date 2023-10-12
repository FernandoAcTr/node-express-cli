import { sequelize } from '@/database/datasources'
import { CreationOptional, InferAttributes, InferCreationAttributes, Model, DataTypes } from 'sequelize'

export class __EntityName__ extends Model<InferAttributes<__EntityName__>, InferCreationAttributes<__EntityName__>> {
  declare id: CreationOptional<number>
  declare foo: string
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

__EntityName__.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    foo: {
      type: DataTypes.STRING,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize }
)

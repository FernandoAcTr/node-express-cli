import { sequelize } from "@database/datasources";
import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Model,
  DataTypes,
} from "sequelize";

export class Seed extends Model<InferAttributes<Seed>, InferCreationAttributes<Seed>> {
  declare id: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;
}

Seed.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    createdAt: DataTypes.DATE,
  },
  { sequelize, createdAt: true, updatedAt: false }
);

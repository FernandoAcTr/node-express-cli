import { sequelize } from "@database/datasources";
import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Model,
  DataTypes,
} from "sequelize";

export class Seed extends Model<InferAttributes<Seed>, InferCreationAttributes<Seed>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare createdAt: CreationOptional<Date>;
}

Seed.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
    },
    createdAt: DataTypes.DATE,
  },
  { sequelize, createdAt: true, updatedAt: false }
);

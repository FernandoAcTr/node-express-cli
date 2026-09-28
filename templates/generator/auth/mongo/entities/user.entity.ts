import mongoose, { Model } from 'mongoose'
import { hash } from '@/utils/hash'
import { config } from '@/config'
import jwt from 'jsonwebtoken'

export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

export interface IUser {
  name: string
  email: string
  password: string
  role: Role
  created_at: Date
  updated_at: Date
}

export interface IUserMethods {
  encryptPassword(password: string): string
  comparePassword(password: string): boolean
  createToken(): string
  createRefreshToken(): string
}

type UserModel = Model<IUser, {}, IUserMethods>

const UserSchema = new mongoose.Schema<IUser, UserModel, IUserMethods>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: Role.USER },
  created_at: { type: Date, default: new Date() },
  updated_at: { type: Date, default: new Date() },
})

UserSchema.methods.toJSON = function () {
  const user: any = this.toObject()
  const { __v, password, ...rest } = user
  return rest
}

UserSchema.methods.createToken = function () {
  return jwt.sign({ user_id: this._id }, config.SECRET, {
    expiresIn: 86400,
  })
}

UserSchema.methods.createRefreshToken = function () {
  return jwt.sign({ user_id: this._id, _: Math.random() }, config.SECRET, {
    expiresIn: 86400,
  })
}

UserSchema.methods.encryptPassword = function (password: string) {
  return hash.make(password)
}

UserSchema.methods.comparePassword = function (password: string) {
  return hash.compare(password, this.password)
}

export const User = mongoose.model<IUser, UserModel>('User', UserSchema)

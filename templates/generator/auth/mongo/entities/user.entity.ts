import mongoose, { Document } from 'mongoose'
import { hash } from '@/utils/hash'
import { config } from '@/config'
import jwt from 'jsonwebtoken'

export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

export interface IUser extends Document {
  name: string
  email: string
  password: string
  role: Role
  created_at: Date
  updated_at: Date
  encryptPassword(password: string): string
  comparePassword(password: string): boolean
  createToken(): string
  createRefreshToken(): string
}

const UserSchema = new mongoose.Schema<IUser>({
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
  const user = this.toObject()

  return jwt.sign({ user_id: user._id }, config.SECRET, {
    expiresIn: 86400,
  })
}

UserSchema.methods.createRefreshToken = function () {
  const user = this.toObject()

  return jwt.sign({ user_id: user._id, _: Math.random() }, config.SECRET, {
    expiresIn: 86400,
  })
}

UserSchema.methods.encryptPassword = function (password: string) {
  return hash.make(password)
}

UserSchema.methods.comparePassword = function (password: string) {
  let user = this.toObject()
  return hash.compare(password, user.password)
}

export const User = mongoose.model<IUser>('User', UserSchema)

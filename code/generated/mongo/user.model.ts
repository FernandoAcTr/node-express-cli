import mongoose, { Document } from 'mongoose'
import bcrypt from 'bcrypt'
import { settings } from '@config/settings'
import jwt from 'jsonwebtoken'

export interface IUser extends Document {
  name: string
  email: string
  password: string
  created_at: Date
  updated_at: Date
  encryptPassword(password: string): string
  comparePassword(password: string): boolean
  createToken(): string
}

const UserSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
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

  return jwt.sign({ _id: user._id }, settings.SECRET, {
    expiresIn: 86400,
  })
}

UserSchema.methods.encryptPassword = function (password: string) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10))
}

UserSchema.methods.comparePassword = function (password: string) {
  let user = this.toObject()
  return bcrypt.compareSync(password, user.password)
}

export const User = mongoose.model<IUser>('User', UserSchema)

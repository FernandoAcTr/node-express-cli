import mongoose, { HydratedDocument, Model } from 'mongoose'

export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

export interface IUser {
  name: string
  email: string
  password: string
  email_verified_at: Date | null
  role: Role
  created_at: Date
  updated_at: Date
}

export type UserDocument = HydratedDocument<IUser>

type UserModel = Model<IUser>

const UserSchema = new mongoose.Schema<IUser, UserModel>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  email_verified_at: { type: Date, default: null },
  role: { type: String, required: true, enum: Object.values(Role), default: Role.USER },
  created_at: { type: Date, default: () => new Date() },
  updated_at: { type: Date, default: () => new Date() },
})

UserSchema.methods.toJSON = function () {
  const user: Record<string, unknown> = this.toObject()
  const { __v, password, ...rest } = user

  return rest
}

export const User = mongoose.model<IUser, UserModel>('User', UserSchema)

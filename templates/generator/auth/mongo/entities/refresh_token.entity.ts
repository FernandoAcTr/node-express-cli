import mongoose, { HydratedDocument, Model, Types } from 'mongoose'

export interface IRefreshToken {
  refresh_token: string
  user_id: Types.ObjectId
  created_at: Date
  updated_at: Date
  expires_at: Date
}

export type RefreshTokenDocument = HydratedDocument<IRefreshToken>

type RefreshTokenModel = Model<IRefreshToken>

const RefreshTokenSchema = new mongoose.Schema<IRefreshToken, RefreshTokenModel>({
  refresh_token: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  created_at: { type: Date, default: () => new Date() },
  updated_at: { type: Date, default: () => new Date() },
  expires_at: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
})

export const RefreshToken = mongoose.model<IRefreshToken, RefreshTokenModel>('RefreshToken', RefreshTokenSchema)

import mongoose, { Document, Types } from 'mongoose'

export interface IRefreshToken extends Document {
  refresh_token: string
  user_id: Types.ObjectId
  created_at: Date
  updated_at: Date
}

const RefreshTokenSchema = new mongoose.Schema<IRefreshToken>({
  refresh_token: { type: String },
  created_at: { type: Date, default: new Date() },
  updated_at: { type: Date, default: new Date() },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
})

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema)

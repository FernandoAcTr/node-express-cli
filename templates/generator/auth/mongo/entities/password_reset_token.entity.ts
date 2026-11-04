import mongoose, { HydratedDocument, Model, Types } from 'mongoose'

export interface IPasswordResetToken {
  token: string
  user_id: Types.ObjectId
  created_at: Date
  updated_at: Date
  expires_at: Date
}

export type PasswordResetTokenDocument = HydratedDocument<IPasswordResetToken>

type PasswordResetTokenModel = Model<IPasswordResetToken>

const PasswordResetTokenSchema = new mongoose.Schema<IPasswordResetToken, PasswordResetTokenModel>({
  token: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  created_at: { type: Date, default: () => new Date() },
  updated_at: { type: Date, default: () => new Date() },
  expires_at: { type: Date, required: true },
})

export const PasswordResetToken = mongoose.model<IPasswordResetToken, PasswordResetTokenModel>(
  'PasswordResetToken',
  PasswordResetTokenSchema
)

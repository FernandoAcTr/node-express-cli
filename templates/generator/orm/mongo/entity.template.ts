import mongoose, { Document } from 'mongoose'

export interface I__EntityName__ extends Document {
  foo: string
  created_at: Date
  updated_at: Date
}

const __EntityName__Schema = new mongoose.Schema<I__EntityName__>({
  foo: { type: String },
  created_at: { type: Date, default: new Date() },
  updated_at: { type: Date, default: new Date() },
})

export const __EntityName__ = mongoose.model<I__EntityName__>('__EntityName__', __EntityName__Schema)

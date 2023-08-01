import mongoose, { Document } from 'mongoose'

export interface ISeed extends Document {
  id: string
  created_at: Date
  updated_at: Date
}

const SeedSchema = new mongoose.Schema<ISeed>({
  id: { type: String },
  created_at: { type: Date, default: new Date() },
  updated_at: { type: Date, default: new Date() },
})

export const Seed = mongoose.model<ISeed>('Seed', SeedSchema)

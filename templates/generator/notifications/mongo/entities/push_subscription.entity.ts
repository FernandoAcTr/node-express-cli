import mongoose, { HydratedDocument, Model } from 'mongoose'

export interface IPushSubscription {
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: Date
  updated_at: Date
}

export type PushSubscriptionDocument = HydratedDocument<IPushSubscription>

type PushSubscriptionModel = Model<IPushSubscription>

const PushSubscriptionSchema = new mongoose.Schema<IPushSubscription, PushSubscriptionModel>({
  user_id: { type: String, required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  p256dh: { type: String, required: true },
  auth: { type: String, required: true },
  created_at: { type: Date, default: () => new Date() },
  updated_at: { type: Date, default: () => new Date() },
})

export const PushSubscription = mongoose.model<IPushSubscription, PushSubscriptionModel>(
  'PushSubscription',
  PushSubscriptionSchema
)

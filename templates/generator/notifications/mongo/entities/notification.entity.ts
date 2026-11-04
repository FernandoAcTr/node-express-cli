import mongoose, { HydratedDocument, Model } from 'mongoose'

export interface INotification {
  notifiable_id: string
  notifiable_type: string
  type: string
  data: Record<string, unknown> | null
  read_at: Date | null
  created_at: Date
  updated_at: Date
}

export type NotificationDocument = HydratedDocument<INotification>

type NotificationModel = Model<INotification>

const NotificationSchema = new mongoose.Schema<INotification, NotificationModel>({
  notifiable_id: { type: String, required: true, index: true },
  notifiable_type: { type: String, required: true },
  type: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: null },
  read_at: { type: Date, default: null },
  created_at: { type: Date, default: () => new Date() },
  updated_at: { type: Date, default: () => new Date() },
})

NotificationSchema.index({ notifiable_id: 1, read_at: 1 })

export const Notification = mongoose.model<INotification, NotificationModel>('Notification', NotificationSchema)

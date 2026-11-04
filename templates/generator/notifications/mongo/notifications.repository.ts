import { Types } from 'mongoose'
import { Notification, NotificationDocument } from '@/entities/notification.entity'
import {
  CreateNotificationInput,
  ListNotificationsOptions,
  NotificationRecord,
  NotificationRepository,
  NotifiableId,
} from '@/modules/notifications/notifications.types'

export class MongoNotificationRepository implements NotificationRepository {
  async create(input: CreateNotificationInput): Promise<NotificationRecord> {
    const notification = await Notification.create({
      notifiable_id: String(input.notifiable_id),
      notifiable_type: input.notifiable_type,
      type: input.type,
      data: input.data,
      read_at: null,
    })

    return toRecord(notification)
  }

  async list(notifiableId: NotifiableId, options: ListNotificationsOptions = {}): Promise<NotificationRecord[]> {
    const query = Notification.find({
      notifiable_id: String(notifiableId),
      ...(options.unreadOnly ? { read_at: null } : {}),
    }).sort({ created_at: -1 })

    if (options.limit) {
      query.limit(options.limit)
    }

    return (await query.exec()).map(toRecord)
  }

  async countUnread(notifiableId: NotifiableId): Promise<number> {
    return Notification.countDocuments({
      notifiable_id: String(notifiableId),
      read_at: null,
    })
  }

  async findOne(id: string, notifiableId: NotifiableId): Promise<NotificationRecord | null> {
    const objectId = toObjectId(id)
    if (!objectId) return null

    const notification = await Notification.findOne({
      _id: objectId,
      notifiable_id: String(notifiableId),
    })

    return notification ? toRecord(notification) : null
  }

  async markAsRead(id: string, notifiableId: NotifiableId): Promise<boolean> {
    const objectId = toObjectId(id)
    if (!objectId) return false

    const result = await Notification.updateOne(
      { _id: objectId, notifiable_id: String(notifiableId), read_at: null },
      { read_at: new Date(), updated_at: new Date() }
    )

    return result.modifiedCount > 0
  }

  async markAllAsRead(notifiableId: NotifiableId): Promise<number> {
    const result = await Notification.updateMany(
      { notifiable_id: String(notifiableId), read_at: null },
      { read_at: new Date(), updated_at: new Date() }
    )

    return result.modifiedCount
  }

  async delete(id: string, notifiableId: NotifiableId): Promise<boolean> {
    const objectId = toObjectId(id)
    if (!objectId) return false

    const result = await Notification.deleteOne({
      _id: objectId,
      notifiable_id: String(notifiableId),
    })

    return result.deletedCount > 0
  }
}

function toObjectId(id: string): Types.ObjectId | null {
  if (!Types.ObjectId.isValid(String(id))) return null

  return new Types.ObjectId(String(id))
}

function toRecord(notification: NotificationDocument): NotificationRecord {
  return {
    id: notification._id.toString(),
    notifiable_id: notification.notifiable_id,
    notifiable_type: notification.notifiable_type,
    type: notification.type,
    data: (notification.data as Record<string, unknown> | null) ?? null,
    read_at: notification.read_at ?? null,
    created_at: notification.created_at,
    updated_at: notification.updated_at,
  }
}

export const notificationRepository = new MongoNotificationRepository()

import { Op } from 'sequelize'
import { Notification } from '@/entities/notification.entity'
import {
  CreateNotificationInput,
  ListNotificationsOptions,
  NotificationRecord,
  NotificationRepository,
  NotifiableId,
} from '@/modules/notifications/notifications.types'

export class SequelizeNotificationRepository implements NotificationRepository {
  async create(input: CreateNotificationInput): Promise<NotificationRecord> {
    const notification = await Notification.create({
      notifiableId: String(input.notifiable_id),
      notifiableType: input.notifiable_type,
      type: input.type,
      data: input.data,
      readAt: null,
    })

    return toRecord(notification)
  }

  async list(notifiableId: NotifiableId, options: ListNotificationsOptions = {}): Promise<NotificationRecord[]> {
    const notifications = await Notification.findAll({
      where: {
        notifiableId: String(notifiableId),
        ...(options.unreadOnly ? { readAt: { [Op.is]: null } } : {}),
      },
      order: [['createdAt', 'DESC']],
      ...(options.limit ? { limit: options.limit } : {}),
    })

    return notifications.map(toRecord)
  }

  async countUnread(notifiableId: NotifiableId): Promise<number> {
    return Notification.count({
      where: {
        notifiableId: String(notifiableId),
        readAt: { [Op.is]: null },
      },
    })
  }

  async findOne(id: string, notifiableId: NotifiableId): Promise<NotificationRecord | null> {
    const notification = await Notification.findOne({
      where: { id: String(id), notifiableId: String(notifiableId) },
    })

    return notification ? toRecord(notification) : null
  }

  async markAsRead(id: string, notifiableId: NotifiableId): Promise<boolean> {
    const [affected] = await Notification.update(
      { readAt: new Date() },
      {
        where: {
          id: String(id),
          notifiableId: String(notifiableId),
          readAt: { [Op.is]: null },
        },
      }
    )

    return affected > 0
  }

  async markAllAsRead(notifiableId: NotifiableId): Promise<number> {
    const [affected] = await Notification.update(
      { readAt: new Date() },
      {
        where: {
          notifiableId: String(notifiableId),
          readAt: { [Op.is]: null },
        },
      }
    )

    return affected
  }

  async delete(id: string, notifiableId: NotifiableId): Promise<boolean> {
    const affected = await Notification.destroy({
      where: { id: String(id), notifiableId: String(notifiableId) },
    })

    return affected > 0
  }
}

function toRecord(notification: Notification): NotificationRecord {
  return {
    id: notification.id,
    notifiable_id: notification.notifiableId,
    notifiable_type: notification.notifiableType,
    type: notification.type,
    data: notification.data ?? null,
    read_at: notification.readAt ?? null,
    created_at: notification.createdAt,
    updated_at: notification.updatedAt,
  }
}

export const notificationRepository = new SequelizeNotificationRepository()

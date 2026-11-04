import { prisma } from '@/database/client'
import {
  CreateNotificationInput,
  ListNotificationsOptions,
  NotificationRecord,
  NotificationRepository,
  NotifiableId,
} from '@/modules/notifications/notifications.types'

interface PrismaNotification {
  id: string
  notifiable_id: string
  notifiable_type: string
  type: string
  data: unknown
  read_at: Date | null
  created_at: Date
  updated_at: Date
}

export class PrismaNotificationRepository implements NotificationRepository {
  async create(input: CreateNotificationInput): Promise<NotificationRecord> {
    const notification = await prisma.notification.create({
      data: {
        notifiable_id: String(input.notifiable_id),
        notifiable_type: input.notifiable_type,
        type: input.type,
        data: (input.data ?? undefined) as any,
        read_at: null,
      },
    })

    return toRecord(notification)
  }

  async list(notifiableId: NotifiableId, options: ListNotificationsOptions = {}): Promise<NotificationRecord[]> {
    const notifications = await prisma.notification.findMany({
      where: {
        notifiable_id: String(notifiableId),
        ...(options.unreadOnly ? { read_at: null } : {}),
      },
      orderBy: { created_at: 'desc' },
      ...(options.limit ? { take: options.limit } : {}),
    })

    return notifications.map(toRecord)
  }

  async countUnread(notifiableId: NotifiableId): Promise<number> {
    return prisma.notification.count({
      where: {
        notifiable_id: String(notifiableId),
        read_at: null,
      },
    })
  }

  async findOne(id: string, notifiableId: NotifiableId): Promise<NotificationRecord | null> {
    const notification = await prisma.notification.findFirst({
      where: { id: String(id), notifiable_id: String(notifiableId) },
    })

    return notification ? toRecord(notification) : null
  }

  async markAsRead(id: string, notifiableId: NotifiableId): Promise<boolean> {
    const result = await prisma.notification.updateMany({
      where: {
        id: String(id),
        notifiable_id: String(notifiableId),
        read_at: null,
      },
      data: { read_at: new Date() },
    })

    return result.count > 0
  }

  async markAllAsRead(notifiableId: NotifiableId): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        notifiable_id: String(notifiableId),
        read_at: null,
      },
      data: { read_at: new Date() },
    })

    return result.count
  }

  async delete(id: string, notifiableId: NotifiableId): Promise<boolean> {
    const result = await prisma.notification.deleteMany({
      where: { id: String(id), notifiable_id: String(notifiableId) },
    })

    return result.count > 0
  }
}

function toRecord(notification: PrismaNotification): NotificationRecord {
  return {
    id: notification.id,
    notifiable_id: notification.notifiable_id,
    notifiable_type: notification.notifiable_type,
    type: notification.type,
    data: (notification.data as Record<string, unknown> | null) ?? null,
    read_at: notification.read_at ?? null,
    created_at: notification.created_at,
    updated_at: notification.updated_at,
  }
}

export const notificationRepository = new PrismaNotificationRepository()

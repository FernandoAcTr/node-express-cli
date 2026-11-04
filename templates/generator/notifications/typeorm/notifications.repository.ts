import { AppDataSource } from '@/database/datasources'
import { Notification } from '@/entities/notification.entity'
import {
  CreateNotificationInput,
  ListNotificationsOptions,
  NotificationRecord,
  NotificationRepository,
  NotifiableId,
} from '@/modules/notifications/notifications.types'

export class TypeOrmNotificationRepository implements NotificationRepository {
  private get repository() {
    return AppDataSource.getRepository(Notification)
  }

  async create(input: CreateNotificationInput): Promise<NotificationRecord> {
    const notification = this.repository.create({
      notifiable_id: String(input.notifiable_id),
      notifiable_type: input.notifiable_type,
      type: input.type,
      data: input.data,
      read_at: null,
    })

    return toRecord(await this.repository.save(notification))
  }

  async list(notifiableId: NotifiableId, options: ListNotificationsOptions = {}): Promise<NotificationRecord[]> {
    const query = this.repository
      .createQueryBuilder('notification')
      .where('notification.notifiable_id = :notifiableId', { notifiableId: String(notifiableId) })
      .orderBy('notification.created_at', 'DESC')

    if (options.unreadOnly) {
      query.andWhere('notification.read_at IS NULL')
    }

    if (options.limit) {
      query.take(options.limit)
    }

    return (await query.getMany()).map(toRecord)
  }

  async countUnread(notifiableId: NotifiableId): Promise<number> {
    return this.repository
      .createQueryBuilder('notification')
      .where('notification.notifiable_id = :notifiableId', { notifiableId: String(notifiableId) })
      .andWhere('notification.read_at IS NULL')
      .getCount()
  }

  async findOne(id: string, notifiableId: NotifiableId): Promise<NotificationRecord | null> {
    const notification = await this.repository.findOne({
      where: { id: String(id), notifiable_id: String(notifiableId) },
    })

    return notification ? toRecord(notification) : null
  }

  async markAsRead(id: string, notifiableId: NotifiableId): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Notification)
      .set({ read_at: new Date() })
      .where('id = :id AND notifiable_id = :notifiableId AND read_at IS NULL', {
        id: String(id),
        notifiableId: String(notifiableId),
      })
      .execute()

    return (result.affected ?? 0) > 0
  }

  async markAllAsRead(notifiableId: NotifiableId): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Notification)
      .set({ read_at: new Date() })
      .where('notifiable_id = :notifiableId AND read_at IS NULL', { notifiableId: String(notifiableId) })
      .execute()

    return result.affected ?? 0
  }

  async delete(id: string, notifiableId: NotifiableId): Promise<boolean> {
    const result = await this.repository.delete({ id: String(id), notifiable_id: String(notifiableId) })

    return (result.affected ?? 0) > 0
  }
}

function toRecord(notification: Notification): NotificationRecord {
  return {
    id: notification.id,
    notifiable_id: notification.notifiable_id,
    notifiable_type: notification.notifiable_type,
    type: notification.type,
    data: notification.data ?? null,
    read_at: notification.read_at ?? null,
    created_at: notification.created_at,
    updated_at: notification.updated_at,
  }
}

export const notificationRepository = new TypeOrmNotificationRepository()

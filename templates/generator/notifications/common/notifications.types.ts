/**
 * Contrato que comparten el módulo de notificaciones y los repositorios de cada
 * ORM. Los IDs se normalizan a string para que TypeORM, Sequelize, Mongoose y
 * Prisma expongan la misma forma.
 */
export type NotificationId = string
export type NotifiableId = number | string

export interface NotificationRecord {
  id: NotificationId
  notifiable_id: string
  notifiable_type: string
  type: string
  data: Record<string, unknown> | null
  read_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface CreateNotificationInput {
  notifiable_id: NotifiableId
  notifiable_type: string
  type: string
  data: Record<string, unknown> | null
}

export interface ListNotificationsOptions {
  unreadOnly?: boolean
  limit?: number
}

export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<NotificationRecord>
  list(notifiableId: NotifiableId, options?: ListNotificationsOptions): Promise<NotificationRecord[]>
  countUnread(notifiableId: NotifiableId): Promise<number>
  findOne(id: NotificationId, notifiableId: NotifiableId): Promise<NotificationRecord | null>
  markAsRead(id: NotificationId, notifiableId: NotifiableId): Promise<boolean>
  markAllAsRead(notifiableId: NotifiableId): Promise<number>
  delete(id: NotificationId, notifiableId: NotifiableId): Promise<boolean>
}

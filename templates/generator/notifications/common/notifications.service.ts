import { NotFound, Unauthorized } from '@/middlewares/error_handler'
import { Notifiable } from '@/notifications/notifications/notifiable'
import { ListNotificationsOptions, NotificationRecord } from './notifications.types'

function notifiable(userId: number | string): Notifiable {
  if (userId === undefined || userId === null) {
    throw Unauthorized()
  }

  return Notifiable.from({ id: userId })
}

export function listNotifications(userId: number | string, options: ListNotificationsOptions = {}): Promise<NotificationRecord[]> {
  return notifiable(userId).getAllNotifications(options)
}

export async function countNotifications(userId: number | string): Promise<{ count: number }> {
  return { count: await notifiable(userId).countUnreadNotifications() }
}

export async function getNotification(userId: number | string, id: string): Promise<NotificationRecord> {
  const notification = await notifiable(userId).getNotification(id)

  if (!notification) {
    throw NotFound('Notification not found')
  }

  return notification
}

export async function markNotificationAsRead(userId: number | string, id: string): Promise<void> {
  const notification = await notifiable(userId).getNotification(id)

  if (!notification) {
    throw NotFound('Notification not found')
  }

  await notifiable(userId).markAsRead(id)
}

export function markAllNotificationsAsRead(userId: number | string): Promise<void> {
  return notifiable(userId).markAllAsRead()
}

export async function deleteNotification(userId: number | string, id: string): Promise<void> {
  const notification = await notifiable(userId).getNotification(id)

  if (!notification) {
    throw NotFound('Notification not found')
  }

  await notifiable(userId).deleteNotification(id)
}

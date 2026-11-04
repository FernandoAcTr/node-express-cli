import { NotificationAction } from '@/notifications/registry'
import { Socket } from '@/socket'

export function emitNotificationChanged(notifiableId: number | string, action: NotificationAction): void {
  Socket.emitToUser(notifiableId, 'notification:changed', { action })
}

import { NotificationAction } from '@/notifications/registry'

/**
 * Versión sin `install:socket`: la persistencia funciona y los eventos de
 * tiempo real se omiten. `install:notifications` reemplaza este archivo por el
 * que emite en el socket.
 */
export function emitNotificationChanged(_notifiableId: number | string, _action: NotificationAction): void {
  return
}

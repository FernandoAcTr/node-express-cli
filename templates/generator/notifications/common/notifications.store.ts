import { NotificationStore } from '@/notifications/registry'
import { emitNotificationChanged } from '@/notifications/events'
import { notificationRepository } from './notifications.repository'

/**
 * Implementación del almacén que consume `Notifiable`. Se registra al cargar
 * `src/notifications/channels/index.ts`, no al importar este archivo, para que
 * mailer siga funcionando sin `install:notifications`.
 */
export const notificationStore: NotificationStore = {
  list: (notifiableId, options) => notificationRepository.list(notifiableId, options),

  countUnread: (notifiableId) => notificationRepository.countUnread(notifiableId),

  findOne: (id, notifiableId) => notificationRepository.findOne(String(id), notifiableId),

  markAsRead: async (id, notifiableId) => {
    const changed = await notificationRepository.markAsRead(String(id), notifiableId)

    if (changed) {
      emitNotificationChanged(notifiableId, 'read')
    }

    return changed
  },

  markAllAsRead: async (notifiableId) => {
    const count = await notificationRepository.markAllAsRead(notifiableId)

    if (count > 0) {
      emitNotificationChanged(notifiableId, 'read_all')
    }

    return count
  },

  delete: async (id, notifiableId) => {
    const changed = await notificationRepository.delete(String(id), notifiableId)

    if (changed) {
      emitNotificationChanged(notifiableId, 'deleted')
    }

    return changed
  },
}

import { emitNotificationChanged } from '@/notifications/events'
import { INotifiable, INotification, registerNotificationChannel } from '@/notifications/registry'

/**
 * Emite `notification:changed` cuando la notificación se persiste. El cliente
 * debe estar en el room `user-<id>`; revisa `src/socket.ts` para autenticar el
 * handshake en producción (ahora acepta el userId del handshake).
 */
export const socketChannel = {
  name: 'socket',
  supports: (notification: INotification) => typeof notification.toDb === 'function',
  send({ notifiable }: { notifiable: INotifiable; notification: INotification }): void {
    emitNotificationChanged(notifiable.id, 'created')
  },
}

registerNotificationChannel(socketChannel)

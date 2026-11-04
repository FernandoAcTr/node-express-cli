import { notificationRepository } from '@/modules/notifications/notifications.repository'
import { INotifiable, INotification, registerNotificationChannel } from '@/notifications/registry'

export const databaseChannel = {
  name: 'database',
  supports: (notification: INotification) => typeof notification.toDb === 'function',
  async send({ notifiable, notification }: { notifiable: INotifiable; notification: INotification }): Promise<void> {
    await notificationRepository.create({
      notifiable_id: notifiable.id,
      notifiable_type: notification.constructor.name,
      type: notification.dbType || notification.constructor.name,
      data: notification.toDb!(),
    })
  },
}

registerNotificationChannel(databaseChannel)

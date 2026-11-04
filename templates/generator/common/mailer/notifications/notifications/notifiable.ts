import { config } from '@/config'
import logger from '@/utils/logger'
import { Mailer } from '@/utils/mailer'
import {
  INotifiable,
  INotification,
  ListNotificationOptions,
  NotificationStore,
  StoredNotification,
  getNotificationChannels,
  getNotificationStore
} from '../registry'

/**
 * Representa al destinatario de una notificación. El email es opcional: sin él
 * se omiten los canales que lo necesiten.
 *
 * `notify()` solo conoce el contrato `INotification`; los canales extra
 * (database, push, socket) se registran desde `install:notifications`.
 */
export class Notifiable implements INotifiable {
  private constructor(
    public readonly id: number | string,
    public readonly email?: string
  ) {}

  public static from(notifiable: INotifiable): Notifiable {
    return new Notifiable(notifiable.id, notifiable.email)
  }

  public async notify(notification: INotification): Promise<void> {
    if (this.email && typeof notification.toMail === 'function') {
      try {
        await Mailer.sendNotification({
          ...notification.toMail(),
          to: this.email,
          atte: config.MAILER.FROM_NAME || 'The team'
        })
      } catch (error) {
        logger.error(`Failed to send notification email: ${(error as Error).message}`)
      }
    }

    for (const channel of getNotificationChannels()) {
      if (!channel.supports(notification)) continue

      try {
        await channel.send({ notifiable: this, notification })
      } catch (error) {
        logger.error(`Notification channel "${channel.name}" failed: ${(error as Error).message}`)
      }
    }
  }

  public getUnreadNotifications(options: Omit<ListNotificationOptions, 'unreadOnly'> = {}): Promise<StoredNotification[]> {
    return this.requireStore().list(this.id, { ...options, unreadOnly: true })
  }

  public getAllNotifications(options: ListNotificationOptions = {}): Promise<StoredNotification[]> {
    return this.requireStore().list(this.id, options)
  }

  public countUnreadNotifications(): Promise<number> {
    return this.requireStore().countUnread(this.id)
  }

  public getNotification(id: string | number): Promise<StoredNotification | null> {
    return this.requireStore().findOne(id, this.id)
  }

  public async markAsRead(id: string | number): Promise<void> {
    await this.requireStore().markAsRead(id, this.id)
  }

  public async markAllAsRead(): Promise<void> {
    await this.requireStore().markAllAsRead(this.id)
  }

  public async deleteNotification(id: string | number): Promise<void> {
    await this.requireStore().delete(id, this.id)
  }

  private requireStore(): NotificationStore {
    const store = getNotificationStore()

    if (!store) {
      throw new Error('Notification storage is not installed. Run "node-express-cli install:notifications" first.')
    }

    return store
  }
}

import { NotificationOptions } from '@/utils/mailer'
import { INotification, WebPushOptions } from '../registry'

/**
 * Ejemplo de notificación multicanal. `Notifiable` ejecuta solo los canales
 * instalados: sin `install:notifications` no hay persistencia; sin
 * `install:push` no hay push. El email es el canal base de `install:mailer`.
 */
export class WelcomeNotification implements INotification {
  public dbType = 'welcome'

  constructor(
    private readonly name: string,
    private readonly url: string
  ) {}

  toMail(): Omit<NotificationOptions, 'to' | 'atte'> {
    return {
      subject: 'Welcome',
      greeting: `Hi ${this.name},`,
      content: 'Your account is ready. Start by exploring the app.',
      action: {
        title: 'Open the app',
        url: this.url
      }
    }
  }

  toDb(): Record<string, unknown> {
    return {
      name: this.name,
      url: this.url
    }
  }

  toPush(): WebPushOptions {
    return {
      title: 'Welcome',
      body: `Hi ${this.name}, your account is ready.`,
      tag: 'welcome',
      data: {
        url: this.url
      }
    }
  }
}

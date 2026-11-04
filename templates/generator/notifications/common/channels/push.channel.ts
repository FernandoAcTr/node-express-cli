import webpush from 'web-push'
import logger from '@/utils/logger'
import { pushSubscriptionRepository } from '@/modules/notifications/push/push.repository'
import { INotifiable, INotification, WebPushOptions, registerNotificationChannel } from '@/notifications/registry'

export const pushChannel = {
  name: 'push',
  supports: (notification: INotification) => typeof notification.toPush === 'function',
  async send({ notifiable, notification }: { notifiable: INotifiable; notification: INotification }): Promise<void> {
    const subscriptions = await pushSubscriptionRepository.findForUser(notifiable.id)
    if (subscriptions.length === 0) return

    const payload: WebPushOptions = notification.toPush!()
    payload.icon = payload.icon ?? '/img/favicon/web-app-manifest-192x192.png'
    payload.badge = payload.badge ?? '/img/favicon/web-app-manifest-192x192.png'
    payload.requireInteraction = payload.requireInteraction ?? false

    const results = await Promise.allSettled(
      subscriptions.map((subscription) =>
        webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload)
        )
      )
    )

    const staleIds: string[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') return

      const error = result.reason as { statusCode?: number; body?: string; message?: string }

      if (error?.statusCode === 410 || error?.statusCode === 404) {
        staleIds.push(subscriptions[index].id)
        return
      }

      logger.warn(
        `Push notification failed for subscription ${subscriptions[index].id}: status=${error?.statusCode} body=${error?.body} message=${error?.message}`
      )
    })

    if (staleIds.length > 0) {
      await pushSubscriptionRepository.removeByIds(staleIds)
    }
  },
}

registerNotificationChannel(pushChannel)

import { config } from '@/config'
import { pushSubscriptionRepository } from './push.repository'

export function getPublicKey(): string | undefined {
  return config.VAPID.PUBLIC_KEY
}

export async function subscribe(userId: number | string, endpoint: string, p256dh: string, auth: string): Promise<void> {
  await pushSubscriptionRepository.upsert({
    user_id: userId,
    endpoint,
    p256dh,
    auth,
  })
}

export async function unsubscribe(userId: number | string, endpoint: string): Promise<void> {
  await pushSubscriptionRepository.removeByEndpoint(endpoint, userId)
}

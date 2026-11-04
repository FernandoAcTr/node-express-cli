import { prisma } from '@/database/client'
import {
  PushSubscriptionRecord,
  PushSubscriptionRepository,
  UpsertPushSubscriptionInput,
} from '@/modules/notifications/push/types/push.types'

interface PrismaPushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: Date
  updated_at: Date
}

export class PrismaPushSubscriptionRepository implements PushSubscriptionRepository {
  async findForUser(userId: number | string): Promise<PushSubscriptionRecord[]> {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { user_id: String(userId) },
    })

    return subscriptions.map(toRecord)
  }

  async upsert(input: UpsertPushSubscriptionInput): Promise<void> {
    await prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      update: {
        user_id: String(input.user_id),
        p256dh: input.p256dh,
        auth: input.auth,
      },
      create: {
        user_id: String(input.user_id),
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      },
    })
  }

  async removeByEndpoint(endpoint: string, userId: number | string): Promise<void> {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, user_id: String(userId) },
    })
  }

  async removeByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return

    await prisma.pushSubscription.deleteMany({
      where: { id: { in: ids } },
    })
  }
}

function toRecord(subscription: PrismaPushSubscription): PushSubscriptionRecord {
  return {
    id: subscription.id,
    user_id: subscription.user_id,
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
    created_at: subscription.created_at,
    updated_at: subscription.updated_at,
  }
}

export const pushSubscriptionRepository = new PrismaPushSubscriptionRepository()

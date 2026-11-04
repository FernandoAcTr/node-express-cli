import { Op } from 'sequelize'
import { PushSubscription } from '@/entities/push_subscription.entity'
import {
  PushSubscriptionRecord,
  PushSubscriptionRepository,
  UpsertPushSubscriptionInput,
} from '@/modules/notifications/push/types/push.types'

export class SequelizePushSubscriptionRepository implements PushSubscriptionRepository {
  async findForUser(userId: number | string): Promise<PushSubscriptionRecord[]> {
    const subscriptions = await PushSubscription.findAll({ where: { userId: String(userId) } })

    return subscriptions.map(toRecord)
  }

  async upsert(input: UpsertPushSubscriptionInput): Promise<void> {
    const existing = await PushSubscription.findOne({ where: { endpoint: input.endpoint } })

    if (existing) {
      existing.userId = String(input.user_id)
      existing.p256dh = input.p256dh
      existing.auth = input.auth
      await existing.save()
      return
    }

    await PushSubscription.create({
      userId: String(input.user_id),
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
    })
  }

  async removeByEndpoint(endpoint: string, userId: number | string): Promise<void> {
    await PushSubscription.destroy({ where: { endpoint, userId: String(userId) } })
  }

  async removeByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return

    await PushSubscription.destroy({ where: { id: { [Op.in]: ids } } })
  }
}

function toRecord(subscription: PushSubscription): PushSubscriptionRecord {
  return {
    id: subscription.id,
    user_id: subscription.userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
    created_at: subscription.createdAt,
    updated_at: subscription.updatedAt,
  }
}

export const pushSubscriptionRepository = new SequelizePushSubscriptionRepository()

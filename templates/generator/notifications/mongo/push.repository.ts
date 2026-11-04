import { Types } from 'mongoose'
import { PushSubscription, PushSubscriptionDocument } from '@/entities/push_subscription.entity'
import {
  PushSubscriptionRecord,
  PushSubscriptionRepository,
  UpsertPushSubscriptionInput,
} from '@/modules/notifications/push/types/push.types'

export class MongoPushSubscriptionRepository implements PushSubscriptionRepository {
  async findForUser(userId: number | string): Promise<PushSubscriptionRecord[]> {
    const subscriptions = await PushSubscription.find({ user_id: String(userId) })

    return subscriptions.map(toRecord)
  }

  async upsert(input: UpsertPushSubscriptionInput): Promise<void> {
    await PushSubscription.findOneAndUpdate(
      { endpoint: input.endpoint },
      {
        user_id: String(input.user_id),
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        updated_at: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  }

  async removeByEndpoint(endpoint: string, userId: number | string): Promise<void> {
    await PushSubscription.deleteOne({ endpoint, user_id: String(userId) })
  }

  async removeByIds(ids: string[]): Promise<void> {
    const objectIds = ids.filter((id) => Types.ObjectId.isValid(String(id))).map((id) => new Types.ObjectId(String(id)))

    if (objectIds.length === 0) return

    await PushSubscription.deleteMany({ _id: { $in: objectIds } })
  }
}

function toRecord(subscription: PushSubscriptionDocument): PushSubscriptionRecord {
  return {
    id: subscription._id.toString(),
    user_id: subscription.user_id,
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
    created_at: subscription.created_at,
    updated_at: subscription.updated_at,
  }
}

export const pushSubscriptionRepository = new MongoPushSubscriptionRepository()

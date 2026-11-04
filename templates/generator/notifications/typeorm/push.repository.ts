import { AppDataSource } from '@/database/datasources'
import { PushSubscription } from '@/entities/push_subscription.entity'
import {
  PushSubscriptionRecord,
  PushSubscriptionRepository,
  UpsertPushSubscriptionInput,
} from '@/modules/notifications/push/types/push.types'

export class TypeOrmPushSubscriptionRepository implements PushSubscriptionRepository {
  private get repository() {
    return AppDataSource.getRepository(PushSubscription)
  }

  async findForUser(userId: number | string): Promise<PushSubscriptionRecord[]> {
    const subscriptions = await this.repository.find({ where: { user_id: String(userId) } })

    return subscriptions.map(toRecord)
  }

  async upsert(input: UpsertPushSubscriptionInput): Promise<void> {
    const existing = await this.repository.findOne({ where: { endpoint: input.endpoint } })

    if (existing) {
      existing.user_id = String(input.user_id)
      existing.p256dh = input.p256dh
      existing.auth = input.auth
      await this.repository.save(existing)
      return
    }

    await this.repository.save(
      this.repository.create({
        user_id: String(input.user_id),
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      })
    )
  }

  async removeByEndpoint(endpoint: string, userId: number | string): Promise<void> {
    await this.repository.delete({ endpoint, user_id: String(userId) })
  }

  async removeByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return

    await this.repository.delete(ids)
  }
}

function toRecord(subscription: PushSubscription): PushSubscriptionRecord {
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

export const pushSubscriptionRepository = new TypeOrmPushSubscriptionRepository()

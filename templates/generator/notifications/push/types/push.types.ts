export interface PushSubscriptionRecord {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: Date
  updated_at: Date
}

export interface UpsertPushSubscriptionInput {
  user_id: number | string
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushSubscriptionRepository {
  findForUser(userId: number | string): Promise<PushSubscriptionRecord[]>
  upsert(input: UpsertPushSubscriptionInput): Promise<void>
  removeByEndpoint(endpoint: string, userId: number | string): Promise<void>
  removeByIds(ids: string[]): Promise<void>
}

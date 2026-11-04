import { NotificationOptions } from '@/utils/mailer'

export type NotificationAction = 'created' | 'read' | 'read_all' | 'deleted'

export interface WebPushOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag: string
  requireInteraction?: boolean
  action_url?: string
  data: Record<string, unknown>
  actions?: Array<{ action: string; title: string }>
}

export interface INotifiable {
  id: number | string
  email?: string
}

export interface INotification {
  toMail?: () => Omit<NotificationOptions, 'to' | 'atte'>
  toDb?: () => Record<string, unknown>
  toPush?: () => WebPushOptions
  /** Identificador estable para la base de datos; por defecto, el nombre de la clase. */
  dbType?: string
}

export interface StoredNotification {
  id: string
  notifiable_id: string
  notifiable_type: string
  type: string
  data: Record<string, unknown> | null
  read_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface ListNotificationOptions {
  unreadOnly?: boolean
  limit?: number
}

export interface NotificationStore {
  list(notifiableId: number | string, options?: ListNotificationOptions): Promise<StoredNotification[]>
  countUnread(notifiableId: number | string): Promise<number>
  findOne(id: string | number, notifiableId: number | string): Promise<StoredNotification | null>
  markAsRead(id: string | number, notifiableId: number | string): Promise<boolean>
  markAllAsRead(notifiableId: number | string): Promise<number>
  delete(id: string | number, notifiableId: number | string): Promise<boolean>
}

export interface NotificationChannelContext {
  notifiable: INotifiable
  notification: INotification
}

export interface NotificationChannel {
  name: string
  supports(notification: INotification): boolean
  send(context: NotificationChannelContext): Promise<void> | void
}

const channels: NotificationChannel[] = []
let store: NotificationStore | null = null

/** Activa un canal extra (database, push, socket…). Los canales son idempotentes por nombre. */
export function registerNotificationChannel(channel: NotificationChannel): void {
  const index = channels.findIndex((candidate) => candidate.name === channel.name)

  if (index === -1) {
    channels.push(channel)
    return
  }

  channels[index] = channel
}

/** `install:notifications` registra aquí la persistencia; mailer no la conoce. */
export function registerNotificationStore(next: NotificationStore): void {
  store = next
}

export function getNotificationChannels(): NotificationChannel[] {
  return channels
}

export function getNotificationStore(): NotificationStore | null {
  return store
}

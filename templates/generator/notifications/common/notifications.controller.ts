import { NextFunction, Request, Response } from 'express'
import { Unauthorized } from '@/middlewares/error_handler'
import * as Service from './notifications.service'

function currentUserId(req: Request): number | string {
  const id = req.user?.id

  if (id === undefined) throw Unauthorized()

  return id
}

/** Express 5 tipa los params como `string | string[]`; nos quedamos con el primero. */
function param(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''

  return value ?? ''
}

function limit(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined

  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notifications = await Service.listNotifications(currentUserId(req), {
      unreadOnly: req.query.unread === 'true' || req.query.unread === '1',
      limit: limit(req.query.limit),
    })

    res.json(notifications)
  } catch (error) {
    next(error)
  }
}

export async function count(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await Service.countNotifications(currentUserId(req)))
  } catch (error) {
    next(error)
  }
}

export async function show(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await Service.getNotification(currentUserId(req), param(req.params.id)))
  } catch (error) {
    next(error)
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await Service.markAllNotificationsAsRead(currentUserId(req))
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await Service.markNotificationAsRead(currentUserId(req), param(req.params.id))
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await Service.deleteNotification(currentUserId(req), param(req.params.id))
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

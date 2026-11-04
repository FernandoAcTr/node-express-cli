import { NextFunction, Request, Response } from 'express'
import { Unauthorized } from '@/middlewares/error_handler'
import { getPublicKey, subscribe, unsubscribe } from './push.service'

function currentUserId(req: Request): number | string {
  const id = req.user?.id

  if (id === undefined) throw Unauthorized()

  return id
}

export function key(_req: Request, res: Response, next: NextFunction): void {
  try {
    res.contentType('text/plain').send(getPublicKey())
  } catch (error) {
    next(error)
  }
}

export async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { endpoint, p256dh, auth } = req.body as { endpoint: string; p256dh: string; auth: string }

    await subscribe(currentUserId(req), endpoint, p256dh, auth)
    res.status(201).json({ message: 'Subscription saved' })
  } catch (error) {
    next(error)
  }
}

export async function destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await unsubscribe(currentUserId(req), req.body.endpoint)
    res.json({ message: 'Subscription removed' })
  } catch (error) {
    next(error)
  }
}

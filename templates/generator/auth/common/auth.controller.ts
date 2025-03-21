import { NextFunction, Request, Response } from 'express'
import { authService } from './services/auth.service'
import { Unauthorized } from '@/middlewares/error_handler'

export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  const body = req.body

  try {
    const user = await authService.signup(body)
    res.json(user)
  } catch (error) {
    next(error)
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  const body = req.body

  try {
    const user = await authService.login(body.email, body.password)
    res.json(user)
  } catch (error) {
    next(error)
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.body.refresh_token) throw Unauthorized()

  try {
    const token = await authService.refreshToken(req.user.id! as any, req.body.refresh_token)
    res.json(token)
  } catch (error) {
    next(error)
  }
}

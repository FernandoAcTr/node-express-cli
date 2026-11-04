import { NextFunction, Request, Response } from 'express'
import { Unauthorized } from '@/middlewares/error_handler'
import { authService } from './auth.service'
import { AuthUserId } from './auth.types'

function currentUserId(req: Request): AuthUserId {
  const id = req.user?.id

  if (id === undefined) throw Unauthorized()

  return id
}

/** Express 5 tipa `req.params` como `string | string[]`; nos quedamos con el primer valor. */
function param(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''

  return value ?? ''
}

export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.signup({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
    })

    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body.email, req.body.password)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.logout(currentUserId(req))
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = await authService.refreshToken(req.body.refresh_token)
    res.json(token)
  } catch (error) {
    next(error)
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.me(currentUserId(req))
    res.json(user)
  } catch (error) {
    next(error)
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.forgotPassword(req.body.email)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.resetPassword(req.body.email, req.body.token, req.body.password)
    res.json({ message: 'Password reset successfully' })
  } catch (error) {
    next(error)
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.me(currentUserId(req))
    const result = await authService.resendVerification(user)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.verifyEmail(param(req.params.id), param(req.params.token))
    res.json(result)
  } catch (error) {
    next(error)
  }
}

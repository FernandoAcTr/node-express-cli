import jwt from 'jsonwebtoken'
import { config } from '@/config'
import { AuthUser } from './auth.types'

export const ACCESS_TOKEN_TTL = '1h'
export const REFRESH_TOKEN_TTL = '7d'
export const EMAIL_VERIFICATION_TTL = '1d'
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

interface AuthTokenPayload {
  user_id: string | number
  type: 'access' | 'refresh' | 'email-verification'
}

export function createAccessToken(user: Pick<AuthUser, 'id'>): string {
  return jwt.sign({ user_id: user.id, type: 'access' }, config.SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  })
}

export function createRefreshToken(user: Pick<AuthUser, 'id'>): string {
  return jwt.sign({ user_id: user.id, type: 'refresh', _: Math.random() }, config.SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  })
}

export function createEmailVerificationToken(user: Pick<AuthUser, 'id'>): string {
  return jwt.sign({ user_id: user.id, type: 'email-verification' }, config.SECRET, {
    expiresIn: EMAIL_VERIFICATION_TTL,
  })
}

export function verifyEmailVerificationToken(token: string): AuthTokenPayload | null {
  try {
    const payload = jwt.verify(token, config.SECRET) as AuthTokenPayload

    return payload.type === 'email-verification' ? payload : null
  } catch {
    return null
  }
}

export function refreshTokenExpiresAt(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
}

export function passwordResetExpiresAt(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TTL_MS)
}

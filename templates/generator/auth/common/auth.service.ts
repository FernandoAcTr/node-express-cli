import crypto from 'crypto'
import { BadRequest, Unauthorized } from '@/middlewares/error_handler'
import { hash } from '@/utils/hash'
import { authMailer, AuthMailer } from './auth.mailer'
import { authRepository } from './auth.repository'
import {
  createAccessToken,
  createEmailVerificationToken,
  createRefreshToken,
  passwordResetExpiresAt,
  refreshTokenExpiresAt,
  verifyEmailVerificationToken,
} from './auth.tokens'
import { AuthRepository, AuthUser, AuthUserRecord, AuthUserId } from './auth.types'

export interface AuthTokens {
  token: string
  refresh_token: string
}

export interface AuthResult extends AuthTokens {
  user: AuthUser
}

/**
 * Lógica de autenticación independiente del ORM.
 *
 * Toda la persistencia pasa por `AuthRepository`; este archivo no importa
 * ninguna librería de base de datos. Añadir un ORM nuevo solo requiere una
 * implementación del repositorio.
 */
export class AuthService {
  constructor(
    private readonly repository: AuthRepository = authRepository,
    private readonly mailer: AuthMailer = authMailer
  ) {}

  async signup(input: { name: string; email: string; password: string }): Promise<AuthResult> {
    const existing = await this.repository.findUserByEmail(input.email)
    if (existing) throw BadRequest('Email already exists')

    const user = await this.repository.createUser({
      name: input.name,
      email: input.email,
      password: hash.make(input.password),
      role: 'user',
    })

    const tokens = await this.issueTokens(user)
    await this.sendVerificationEmail(user)

    return { user, ...tokens }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.repository.findUserByEmail(email)
    if (!user || !hash.compare(password, user.password)) throw BadRequest('Bad credentials')

    const tokens = await this.issueTokens(user)

    return { user: toPublicUser(user), ...tokens }
  }

  /**
   * Rota el refresh token. El endpoint es público porque el access token ya
   * puede haber expirado; la prueba de identidad es el propio refresh token.
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const stored = await this.repository.findRefreshToken(refreshToken)
    if (!stored || stored.expires_at.getTime() <= Date.now()) throw Unauthorized()

    const user = await this.repository.findUserById(stored.user_id)
    if (!user) throw Unauthorized()

    return this.issueTokens(user)
  }

  async logout(userId: AuthUserId): Promise<void> {
    await this.repository.deleteRefreshTokensForUser(userId)
  }

  async me(userId: AuthUserId): Promise<AuthUser> {
    const user = await this.repository.findUserById(userId)
    if (!user) throw Unauthorized()

    return user
  }

  /**
   * No revela si el email existe: el controller siempre responde 204. Si el
   * usuario existe se guarda un token de un solo uso y se envía el correo.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.repository.findUserByEmail(email)
    if (!user) return

    const token = crypto.randomBytes(32).toString('hex')

    await this.repository.createPasswordResetToken({
      user_id: user.id,
      token,
      expires_at: passwordResetExpiresAt(),
    })

    await this.mailer.sendPasswordReset(user, token)
  }

  async resetPassword(email: string, token: string, password: string): Promise<void> {
    const user = await this.repository.findUserByEmail(email)
    if (!user) throw BadRequest('Invalid or expired token')

    const reset = await this.repository.findPasswordResetToken(user.id, token)
    if (!reset || reset.expires_at.getTime() <= Date.now()) throw BadRequest('Invalid or expired token')

    await this.repository.updatePassword(user.id, hash.make(password))
    await this.repository.deletePasswordResetTokensForUser(user.id)
    await this.repository.deleteRefreshTokensForUser(user.id)
  }

  async resendVerification(user: AuthUser): Promise<{ status: string }> {
    if (user.email_verified_at) return { status: 'already-verified' }

    await this.sendVerificationEmail(user)

    return { status: 'verification-link-sent' }
  }

  async verifyEmail(userId: AuthUserId, token: string): Promise<{ verified: boolean }> {
    const payload = verifyEmailVerificationToken(token)
    if (!payload || String(payload.user_id) !== String(userId)) {
      throw BadRequest('Invalid or expired verification link')
    }

    const user = await this.repository.findUserById(userId)
    if (!user) throw BadRequest('User not found')

    if (!user.email_verified_at) {
      await this.repository.markEmailVerified(user.id, new Date())
    }

    return { verified: true }
  }

  private async sendVerificationEmail(user: AuthUser): Promise<void> {
    const token = createEmailVerificationToken(user)
    await this.mailer.sendEmailVerification(user, token)
  }

  private async issueTokens(user: Pick<AuthUser, 'id'>): Promise<AuthTokens> {
    const token = createAccessToken(user)
    const refreshToken = createRefreshToken(user)

    await this.repository.upsertRefreshToken({
      user_id: user.id,
      refresh_token: refreshToken,
      expires_at: refreshTokenExpiresAt(),
    })

    return { token, refresh_token: refreshToken }
  }
}

function toPublicUser(user: AuthUserRecord): AuthUser {
  const { password, ...publicUser } = user

  return publicUser
}

export const authService = new AuthService()

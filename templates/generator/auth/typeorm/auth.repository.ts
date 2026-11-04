import { Repository } from 'typeorm'
import { AppDataSource } from '@/database/datasources'
import { User } from '@/entities/user.entity'
import { Role } from '@/entities/role.entity'
import { RefreshToken } from '@/entities/refresh_token.entity'
import { PasswordResetToken } from '@/entities/password_reset_token.entity'
import {
  AuthRepository,
  AuthRoleName,
  AuthUser,
  AuthUserRecord,
  AuthUserId,
  CreatePasswordResetTokenInput,
  CreateUserInput,
  PasswordResetTokenRecord,
  RefreshTokenRecord,
  UpsertRefreshTokenInput,
} from '@/modules/auth/auth.types'

export class TypeOrmAuthRepository implements AuthRepository {
  // `getRepository` se resuelve en cada operación: AppDataSource se inicializa
  // de forma asíncrona en main.ts y no debe tocarse al importar el módulo.
  private get users(): Repository<User> {
    return AppDataSource.getRepository(User)
  }

  private get roles(): Repository<Role> {
    return AppDataSource.getRepository(Role)
  }

  private get refreshTokens(): Repository<RefreshToken> {
    return AppDataSource.getRepository(RefreshToken)
  }

  private get passwordResetTokens(): Repository<PasswordResetToken> {
    return AppDataSource.getRepository(PasswordResetToken)
  }

  async createUser(input: CreateUserInput): Promise<AuthUser> {
    const role = await this.ensureRole(input.role)

    const user = this.users.create({
      name: input.name,
      email: input.email,
      password: input.password,
      role_id: role.id,
    })

    return toUser(await this.users.save(user))
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await this.users.findOne({ where: { email } })

    return user ? toUserRecord(user) : null
  }

  async findUserById(id: AuthUserId): Promise<AuthUser | null> {
    const userId = toNumericId(id)
    if (userId === null) return null

    const user = await this.users.findOne({ where: { id: userId } })

    return user ? toUser(user) : null
  }

  async markEmailVerified(id: AuthUserId, verifiedAt: Date): Promise<void> {
    const userId = toNumericId(id)
    if (userId === null) return

    await this.users.update({ id: userId }, { email_verified_at: verifiedAt })
  }

  async updatePassword(id: AuthUserId, password: string): Promise<void> {
    const userId = toNumericId(id)
    if (userId === null) return

    await this.users.update({ id: userId }, { password })
  }

  async upsertRefreshToken(input: UpsertRefreshTokenInput): Promise<void> {
    const userId = toNumericId(input.user_id)
    if (userId === null) return

    const existing = await this.refreshTokens.findOne({ where: { user_id: userId } })

    if (existing) {
      existing.refresh_token = input.refresh_token
      existing.expires_at = input.expires_at
      await this.refreshTokens.save(existing)
      return
    }

    await this.refreshTokens.save(
      this.refreshTokens.create({
        user_id: userId,
        refresh_token: input.refresh_token,
        expires_at: input.expires_at,
      })
    )
  }

  async findRefreshToken(token: string): Promise<RefreshTokenRecord | null> {
    const stored = await this.refreshTokens.findOne({ where: { refresh_token: token } })

    return stored ? toRefreshToken(stored) : null
  }

  async deleteRefreshTokensForUser(userId: AuthUserId): Promise<void> {
    const id = toNumericId(userId)
    if (id === null) return

    await this.refreshTokens.delete({ user_id: id })
  }

  async createPasswordResetToken(input: CreatePasswordResetTokenInput): Promise<void> {
    const userId = toNumericId(input.user_id)
    if (userId === null) return

    await this.passwordResetTokens.delete({ user_id: userId })
    await this.passwordResetTokens.save(
      this.passwordResetTokens.create({
        user_id: userId,
        token: input.token,
        expires_at: input.expires_at,
      })
    )
  }

  async findPasswordResetToken(userId: AuthUserId, token: string): Promise<PasswordResetTokenRecord | null> {
    const id = toNumericId(userId)
    if (id === null) return null

    const stored = await this.passwordResetTokens.findOne({ where: { user_id: id, token } })

    return stored ? toPasswordResetToken(stored) : null
  }

  async deletePasswordResetTokensForUser(userId: AuthUserId): Promise<void> {
    const id = toNumericId(userId)
    if (id === null) return

    await this.passwordResetTokens.delete({ user_id: id })
  }

  /** El registro crea el rol si la tabla está vacía; así el signup funciona sin seeds. */
  private async ensureRole(name: AuthRoleName): Promise<Role> {
    const existing = await this.roles.findOne({ where: { name } })
    if (existing) return existing

    return this.roles.save(this.roles.create({ name }))
  }
}

function toNumericId(id: AuthUserId): number | null {
  const value = typeof id === 'number' ? id : Number(id)

  return Number.isInteger(value) ? value : null
}

function toUser(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    email_verified_at: user.email_verified_at ?? null,
    created_at: user.created_at ?? new Date(),
    updated_at: user.updated_at ?? new Date(),
  }
}

function toUserRecord(user: User): AuthUserRecord {
  return { ...toUser(user), password: user.password }
}

function toRefreshToken(token: RefreshToken): RefreshTokenRecord {
  return {
    id: token.id,
    user_id: token.user_id,
    refresh_token: token.refresh_token,
    expires_at: token.expires_at,
    created_at: token.created_at,
  }
}

function toPasswordResetToken(token: PasswordResetToken): PasswordResetTokenRecord {
  return {
    id: token.id,
    user_id: token.user_id,
    token: token.token,
    expires_at: token.expires_at,
    created_at: token.created_at,
  }
}

export const authRepository = new TypeOrmAuthRepository()

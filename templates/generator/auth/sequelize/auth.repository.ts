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

export class SequelizeAuthRepository implements AuthRepository {
  async createUser(input: CreateUserInput): Promise<AuthUser> {
    const role = await this.ensureRole(input.role)

    const user = await User.create({
      name: input.name,
      email: input.email,
      password: input.password,
      emailVerifiedAt: null,
      role_id: role.id,
    })

    return toUser(user)
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await User.findOne({ where: { email } })

    return user ? toUserRecord(user) : null
  }

  async findUserById(id: AuthUserId): Promise<AuthUser | null> {
    const userId = toNumericId(id)
    if (userId === null) return null

    const user = await User.findByPk(userId)

    return user ? toUser(user) : null
  }

  async markEmailVerified(id: AuthUserId, verifiedAt: Date): Promise<void> {
    const userId = toNumericId(id)
    if (userId === null) return

    await User.update({ emailVerifiedAt: verifiedAt }, { where: { id: userId } })
  }

  async updatePassword(id: AuthUserId, password: string): Promise<void> {
    const userId = toNumericId(id)
    if (userId === null) return

    await User.update({ password }, { where: { id: userId } })
  }

  async upsertRefreshToken(input: UpsertRefreshTokenInput): Promise<void> {
    const userId = toNumericId(input.user_id)
    if (userId === null) return

    const existing = await RefreshToken.findOne({ where: { user_id: userId } })

    if (existing) {
      existing.refresh_token = input.refresh_token
      existing.expiresAt = input.expires_at
      await existing.save()
      return
    }

    await RefreshToken.create({
      user_id: userId,
      refresh_token: input.refresh_token,
      expiresAt: input.expires_at,
    })
  }

  async findRefreshToken(token: string): Promise<RefreshTokenRecord | null> {
    const stored = await RefreshToken.findOne({ where: { refresh_token: token } })

    return stored ? toRefreshToken(stored) : null
  }

  async deleteRefreshTokensForUser(userId: AuthUserId): Promise<void> {
    const id = toNumericId(userId)
    if (id === null) return

    await RefreshToken.destroy({ where: { user_id: id } })
  }

  async createPasswordResetToken(input: CreatePasswordResetTokenInput): Promise<void> {
    const userId = toNumericId(input.user_id)
    if (userId === null) return

    await PasswordResetToken.destroy({ where: { user_id: userId } })
    await PasswordResetToken.create({
      user_id: userId,
      token: input.token,
      expiresAt: input.expires_at,
    })
  }

  async findPasswordResetToken(userId: AuthUserId, token: string): Promise<PasswordResetTokenRecord | null> {
    const id = toNumericId(userId)
    if (id === null) return null

    const stored = await PasswordResetToken.findOne({ where: { user_id: id, token } })

    return stored ? toPasswordResetToken(stored) : null
  }

  async deletePasswordResetTokensForUser(userId: AuthUserId): Promise<void> {
    const id = toNumericId(userId)
    if (id === null) return

    await PasswordResetToken.destroy({ where: { user_id: id } })
  }

  private async ensureRole(name: AuthRoleName): Promise<Role> {
    const [role] = await Role.findOrCreate({ where: { name }, defaults: { name } })

    return role
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
    email_verified_at: user.emailVerifiedAt ?? null,
    created_at: user.createdAt ?? new Date(),
    updated_at: user.updatedAt ?? new Date(),
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
    expires_at: token.expiresAt,
    created_at: token.createdAt,
  }
}

function toPasswordResetToken(token: PasswordResetToken): PasswordResetTokenRecord {
  return {
    id: token.id,
    user_id: token.user_id,
    token: token.token,
    expires_at: token.expiresAt,
    created_at: token.createdAt,
  }
}

export const authRepository = new SequelizeAuthRepository()

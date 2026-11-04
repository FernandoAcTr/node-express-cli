import { prisma } from '@/database/client'
import {
  AuthRepository,
  AuthUser,
  AuthUserRecord,
  AuthUserId,
  CreatePasswordResetTokenInput,
  CreateUserInput,
  PasswordResetTokenRecord,
  RefreshTokenRecord,
  UpsertRefreshTokenInput,
} from '@/modules/auth/auth.types'

interface PrismaUser {
  id: number
  name: string
  email: string
  password: string
  email_verified_at: Date | null
  created_at: Date
  updated_at: Date
}

interface PrismaRefreshToken {
  id: number
  user_id: number
  refresh_token: string
  expires_at: Date
  created_at: Date
}

interface PrismaPasswordResetToken {
  id: number
  user_id: number
  token: string
  expires_at: Date
  created_at: Date
}

export class PrismaAuthRepository implements AuthRepository {
  async createUser(input: CreateUserInput): Promise<AuthUser> {
    const role = await prisma.role.upsert({
      where: { name: input.role },
      update: {},
      create: { name: input.role },
    })

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: input.password,
        role_id: role.id,
      },
    })

    return toUser(user)
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await prisma.user.findUnique({ where: { email } })

    return user ? toUserRecord(user) : null
  }

  async findUserById(id: AuthUserId): Promise<AuthUser | null> {
    const userId = toNumericId(id)
    if (userId === null) return null

    const user = await prisma.user.findUnique({ where: { id: userId } })

    return user ? toUser(user) : null
  }

  async markEmailVerified(id: AuthUserId, verifiedAt: Date): Promise<void> {
    const userId = toNumericId(id)
    if (userId === null) return

    await prisma.user.update({ where: { id: userId }, data: { email_verified_at: verifiedAt } })
  }

  async updatePassword(id: AuthUserId, password: string): Promise<void> {
    const userId = toNumericId(id)
    if (userId === null) return

    await prisma.user.update({ where: { id: userId }, data: { password } })
  }

  async upsertRefreshToken(input: UpsertRefreshTokenInput): Promise<void> {
    const userId = toNumericId(input.user_id)
    if (userId === null) return

    await prisma.refreshToken.upsert({
      where: { user_id: userId },
      update: { refresh_token: input.refresh_token, expires_at: input.expires_at },
      create: {
        user_id: userId,
        refresh_token: input.refresh_token,
        expires_at: input.expires_at,
      },
    })
  }

  async findRefreshToken(token: string): Promise<RefreshTokenRecord | null> {
    const stored = await prisma.refreshToken.findFirst({ where: { refresh_token: token } })

    return stored ? toRefreshToken(stored) : null
  }

  async deleteRefreshTokensForUser(userId: AuthUserId): Promise<void> {
    const id = toNumericId(userId)
    if (id === null) return

    await prisma.refreshToken.deleteMany({ where: { user_id: id } })
  }

  async createPasswordResetToken(input: CreatePasswordResetTokenInput): Promise<void> {
    const userId = toNumericId(input.user_id)
    if (userId === null) return

    await prisma.passwordResetToken.deleteMany({ where: { user_id: userId } })
    await prisma.passwordResetToken.create({
      data: {
        user_id: userId,
        token: input.token,
        expires_at: input.expires_at,
      },
    })
  }

  async findPasswordResetToken(userId: AuthUserId, token: string): Promise<PasswordResetTokenRecord | null> {
    const id = toNumericId(userId)
    if (id === null) return null

    const stored = await prisma.passwordResetToken.findFirst({ where: { user_id: id, token } })

    return stored ? toPasswordResetToken(stored) : null
  }

  async deletePasswordResetTokensForUser(userId: AuthUserId): Promise<void> {
    const id = toNumericId(userId)
    if (id === null) return

    await prisma.passwordResetToken.deleteMany({ where: { user_id: id } })
  }
}

function toNumericId(id: AuthUserId): number | null {
  const value = typeof id === 'number' ? id : Number(id)

  return Number.isInteger(value) ? value : null
}

function toUser(user: PrismaUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    email_verified_at: user.email_verified_at ?? null,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }
}

function toUserRecord(user: PrismaUser): AuthUserRecord {
  return { ...toUser(user), password: user.password }
}

function toRefreshToken(token: PrismaRefreshToken): RefreshTokenRecord {
  return {
    id: token.id,
    user_id: token.user_id,
    refresh_token: token.refresh_token,
    expires_at: token.expires_at,
    created_at: token.created_at,
  }
}

function toPasswordResetToken(token: PrismaPasswordResetToken): PasswordResetTokenRecord {
  return {
    id: token.id,
    user_id: token.user_id,
    token: token.token,
    expires_at: token.expires_at,
    created_at: token.created_at,
  }
}

export const authRepository = new PrismaAuthRepository()

import { Types } from 'mongoose'
import { Role, User, UserDocument } from '@/entities/user.entity'
import { RefreshToken, RefreshTokenDocument } from '@/entities/refresh_token.entity'
import { PasswordResetToken, PasswordResetTokenDocument } from '@/entities/password_reset_token.entity'
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

export class MongoAuthRepository implements AuthRepository {
  async createUser(input: CreateUserInput): Promise<AuthUser> {
    const user = new User({
      name: input.name,
      email: input.email,
      password: input.password,
      email_verified_at: null,
      role: input.role === 'admin' ? Role.ADMIN : Role.USER,
    })

    return toUser(await user.save())
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await User.findOne({ email })

    return user ? toUserRecord(user) : null
  }

  async findUserById(id: AuthUserId): Promise<AuthUser | null> {
    const userId = toObjectId(id)
    if (!userId) return null

    const user = await User.findOne({ _id: userId })

    return user ? toUser(user) : null
  }

  async markEmailVerified(id: AuthUserId, verifiedAt: Date): Promise<void> {
    const userId = toObjectId(id)
    if (!userId) return

    await User.updateOne({ _id: userId }, { email_verified_at: verifiedAt, updated_at: new Date() })
  }

  async updatePassword(id: AuthUserId, password: string): Promise<void> {
    const userId = toObjectId(id)
    if (!userId) return

    await User.updateOne({ _id: userId }, { password, updated_at: new Date() })
  }

  async upsertRefreshToken(input: UpsertRefreshTokenInput): Promise<void> {
    const userId = toObjectId(input.user_id)
    if (!userId) return

    await RefreshToken.findOneAndUpdate(
      { user_id: userId },
      {
        user_id: userId,
        refresh_token: input.refresh_token,
        expires_at: input.expires_at,
        updated_at: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  }

  async findRefreshToken(token: string): Promise<RefreshTokenRecord | null> {
    const stored = await RefreshToken.findOne({ refresh_token: token })

    return stored ? toRefreshToken(stored) : null
  }

  async deleteRefreshTokensForUser(userId: AuthUserId): Promise<void> {
    const id = toObjectId(userId)
    if (!id) return

    await RefreshToken.deleteMany({ user_id: id })
  }

  async createPasswordResetToken(input: CreatePasswordResetTokenInput): Promise<void> {
    const userId = toObjectId(input.user_id)
    if (!userId) return

    await PasswordResetToken.deleteMany({ user_id: userId })
    await PasswordResetToken.create({
      user_id: userId,
      token: input.token,
      expires_at: input.expires_at,
    })
  }

  async findPasswordResetToken(userId: AuthUserId, token: string): Promise<PasswordResetTokenRecord | null> {
    const id = toObjectId(userId)
    if (!id) return null

    const stored = await PasswordResetToken.findOne({ user_id: id, token })

    return stored ? toPasswordResetToken(stored) : null
  }

  async deletePasswordResetTokensForUser(userId: AuthUserId): Promise<void> {
    const id = toObjectId(userId)
    if (!id) return

    await PasswordResetToken.deleteMany({ user_id: id })
  }
}

function toObjectId(id: AuthUserId): Types.ObjectId | null {
  if (!Types.ObjectId.isValid(String(id))) return null

  return new Types.ObjectId(String(id))
}

function toUser(user: UserDocument): AuthUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    email_verified_at: user.email_verified_at ?? null,
    created_at: user.created_at ?? new Date(),
    updated_at: user.updated_at ?? new Date(),
  }
}

function toUserRecord(user: UserDocument): AuthUserRecord {
  return { ...toUser(user), password: user.password }
}

function toRefreshToken(token: RefreshTokenDocument): RefreshTokenRecord {
  return {
    id: token._id.toString(),
    user_id: token.user_id.toString(),
    refresh_token: token.refresh_token,
    expires_at: token.expires_at,
    created_at: token.created_at,
  }
}

function toPasswordResetToken(token: PasswordResetTokenDocument): PasswordResetTokenRecord {
  return {
    id: token._id.toString(),
    user_id: token.user_id.toString(),
    token: token.token,
    expires_at: token.expires_at,
    created_at: token.created_at,
  }
}

export const authRepository = new MongoAuthRepository()

/**
 * Contrato que comparten el módulo auth y los repositorios de cada ORM.
 *
 * El servicio de auth no conoce MongoDB, TypeORM, Sequelize ni Prisma: solo
 * trabaja con estos tipos normalizados. Cada repositorio traduce su modelo a
 * esta forma (ObjectId -> string, createdAt -> created_at, token -> refresh_token,
 * etc.) y así el resto del módulo es idéntico para todos los motores.
 */
export type AuthUserId = number | string

export type AuthRoleName = 'admin' | 'user'

export interface AuthUser {
  id: AuthUserId
  name: string
  email: string
  email_verified_at: Date | null
  created_at: Date
  updated_at: Date
}

/** Usuario con el hash de la contraseña. Solo lo usa el login. */
export interface AuthUserRecord extends AuthUser {
  password: string
}

export interface RefreshTokenRecord {
  id: AuthUserId
  user_id: AuthUserId
  refresh_token: string
  expires_at: Date
  created_at: Date
}

export interface PasswordResetTokenRecord {
  id: AuthUserId
  user_id: AuthUserId
  token: string
  expires_at: Date
  created_at: Date
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role: AuthRoleName
}

export interface UpsertRefreshTokenInput {
  user_id: AuthUserId
  refresh_token: string
  expires_at: Date
}

export interface CreatePasswordResetTokenInput {
  user_id: AuthUserId
  token: string
  expires_at: Date
}

export interface AuthRepository {
  createUser(input: CreateUserInput): Promise<AuthUser>
  findUserByEmail(email: string): Promise<AuthUserRecord | null>
  findUserById(id: AuthUserId): Promise<AuthUser | null>
  markEmailVerified(id: AuthUserId, verifiedAt: Date): Promise<void>
  updatePassword(id: AuthUserId, password: string): Promise<void>

  upsertRefreshToken(input: UpsertRefreshTokenInput): Promise<void>
  findRefreshToken(token: string): Promise<RefreshTokenRecord | null>
  deleteRefreshTokensForUser(user_id: AuthUserId): Promise<void>

  createPasswordResetToken(input: CreatePasswordResetTokenInput): Promise<void>
  findPasswordResetToken(user_id: AuthUserId, token: string): Promise<PasswordResetTokenRecord | null>
  deletePasswordResetTokensForUser(user_id: AuthUserId): Promise<void>
}

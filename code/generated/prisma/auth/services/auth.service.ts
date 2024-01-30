import jwt from 'jsonwebtoken'
import { HTTPError, Unauthorized } from '@/middlewares/error_handler'
import { PasswordEncrypter } from './passsword_encripter'
import { settings } from '@/config/settings'
import { prisma } from '@/database/client'
import { User } from '@prisma/client'

export enum Roles {
  ADMIN = 1,
  USER = 2,
}

export class AuthService {
  private readonly passwordEncrypter: PasswordEncrypter

  constructor() {
    this.passwordEncrypter = new PasswordEncrypter()
  }

  async signup(user: User) {
    const dbUser = await prisma.user.findFirst({ where: { email: user.email } })
    if (dbUser) throw new HTTPError(400, 'Email already exists')

    const newUser = await prisma.user.create({
      data: {
        email: user.email,
        role_id: Roles.USER,
        password: this.passwordEncrypter.encrypt(user.password),
        name: user.name,
      },
    })

    const token = createToken(newUser)
    const refreshToken = createRefreshToken(newUser)

    await prisma.refreshToken.create({
      data: { user_id: newUser.id, token: refreshToken, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    })

    return { user: newUser, token: token, refresh_token: refreshToken }
  }

  async login(email: string, password: string) {
    const dbUser = await prisma.user.findFirst({ where: { email } })
    if (!dbUser) throw new HTTPError(400, 'Bad credentials')

    const match = this.passwordEncrypter.compare(password, dbUser.password)
    if (!match) throw new HTTPError(400, 'Bad credentials')

    const token = createToken(dbUser)
    const refreshToken = createRefreshToken(dbUser)

    await prisma.refreshToken.create({
      data: {
        user_id: dbUser.id,
        token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return { user: dbUser, token: token, refresh_token: refreshToken }
  }

  async refreshToken(user_id: number, refresh_token: string) {
    const user = await prisma.user.findFirst({ where: { id: user_id } })
    const token = await prisma.refreshToken.findFirst({ where: { user_id: user_id, token: refresh_token } })

    if (!user || !token) throw Unauthorized()
    if (token.expires_at < new Date()) throw Unauthorized()

    const newToken = createToken(user)
    const refreshToken = createRefreshToken(user)

    await prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    await prisma.refreshToken.delete({ where: { id: token.id } })

    return { token: newToken, refresh_token: refreshToken }
  }
}

function createToken(user: User) {
  return jwt.sign({ user_id: user.id }, settings.SECRET, {
    expiresIn: '1h',
  })
}
function createRefreshToken(user: User) {
  return jwt.sign({ user_id: user.id, _: Math.random() }, settings.SECRET, {
    expiresIn: '7d',
  })
}

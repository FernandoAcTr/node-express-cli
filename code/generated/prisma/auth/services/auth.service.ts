import jwt from 'jsonwebtoken'
import { HTTPError, UnauthorizedError } from '@/middlewares/error_handler'
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

    const token = this.createToken(newUser)
    const refreshToken = this.createToken(newUser)

    await prisma.refreshToken.create({
      data: { user_id: newUser.id, token: refreshToken },
    })

    return { user: newUser, token: token, refresh_token: refreshToken }
  }

  async login(email: string, password: string) {
    const dbUser = await prisma.user.findFirst({ where: { email } })
    if (!dbUser) throw new HTTPError(400, 'Bad credentials')

    const match = this.passwordEncrypter.compare(password, dbUser.password)
    if (!match) throw new HTTPError(400, 'Bad credentials')

    const token = this.createToken(dbUser)

    let refreshToken = await prisma.refreshToken.findFirst({ where: { user_id: dbUser.id } })
    if (!refreshToken) {
      refreshToken = await prisma.refreshToken.create({
        data: {
          user_id: dbUser.id,
          token: this.createToken(dbUser),
        },
      })
    }

    return { user: dbUser, token: token, refresh_token: refreshToken.token }
  }

  async refreshToken(user_id: number, refresh_token: string) {
    const user = await prisma.user.findFirst({
      where: { id: user_id, RefreshToken: { token: refresh_token } },
    })
    if (!user) throw new UnauthorizedError()

    const token = this.createToken(user)

    return { token }
  }

  private createToken(user: User) {
    return jwt.sign({ user_id: user.id }, settings.SECRET, {
      expiresIn: '1h',
    })
  }
}

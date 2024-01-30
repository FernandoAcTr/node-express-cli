import jwt from 'jsonwebtoken'
import { User } from '@/entities/user.entity'
import { HTTPError, Unauthorized } from '@/middlewares/error_handler'
import { PasswordEncrypter } from './passsword_encripter'
import { settings } from '@/config/settings'
import { Roles } from '@/entities/role.entity'
import { RefreshToken } from '@/entities/refresh_token.entity'

export class AuthService {
  private passwordEncrypter: PasswordEncrypter

  constructor() {
    this.passwordEncrypter = new PasswordEncrypter()
  }

  async signup(user: User) {
    const dbUser = await User.findOne({ where: { email: user.email } })
    if (dbUser) throw new HTTPError(400, 'Email already exists')

    const newUser = await User.create({
      email: user.email,
      name: user.name,
      role_id: Roles.USER,
      password: this.passwordEncrypter.encrypt(user.password),
    })

    const token = createToken(newUser)
    const refreshToken = createRefreshToken(newUser)

    await RefreshToken.create({
      user_id: newUser.id,
      refresh_token: refreshToken,
      expiresAt: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
    })

    return { user: newUser, token: token, refresh_token: refreshToken }
  }

  async login(email: string, password: string) {
    const dbUser = await User.findOne({ where: { email } })
    if (!dbUser) throw new HTTPError(400, 'Bad credentials')

    const match = this.passwordEncrypter.compare(password, dbUser.password)
    if (!match) throw new HTTPError(400, 'Bad credentials')

    const token = createToken(dbUser)
    const refreshToken = createRefreshToken(dbUser)

    await RefreshToken.create({
      user_id: dbUser.id,
      refresh_token: refreshToken,
      expiresAt: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
    })

    return { user: dbUser, token: token, refresh_token: refreshToken }
  }

  async refreshToken(user_id: number, refresh_token: string) {
    const user = await User.findOne({ where: { id: user_id } })
    const token = await RefreshToken.findOne({ where: { user_id: user_id, refresh_token } })

    if (!user || !token) throw Unauthorized()
    if (token.expiresAt < new Date()) throw Unauthorized()

    const newToken = createToken(user)
    const refreshToken = createRefreshToken(user)

    await RefreshToken.create({
      user_id: user.id,
      refresh_token: createToken(user),
      expiresAt: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
    })

    await token.destroy()

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

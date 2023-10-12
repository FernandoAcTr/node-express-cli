import jwt from 'jsonwebtoken'
import { User } from '@/entities/user.entity'
import { HTTPError, UnauthorizedError } from '@/middlewares/error_handler'
import { PasswordEncrypter } from './passsword_encripter'
import { settings } from '@/config/settings'
import { Roles } from '@/entities/role.entity'
import { Token } from '@/entities/token.entity'

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

    const token = this.createToken(newUser)
    const refreshToken = this.createToken(newUser)

    await Token.create({
      user_id: newUser.id,
      refresh_token: refreshToken,
    })

    return { user: newUser, token: token, refresh_token: refreshToken }
  }

  async login(email: string, password: string) {
    const dbUser = await User.findOne({ where: { email } })
    if (!dbUser) throw new HTTPError(400, 'Bad credentials')

    const match = this.passwordEncrypter.compare(password, dbUser.password)
    if (!match) throw new HTTPError(400, 'Bad credentials')

    const token = this.createToken(dbUser)

    let refreshToken = await Token.findOne({ where: { user_id: dbUser.id } })
    if (!refreshToken) {
      refreshToken = await Token.create({
        user_id: dbUser.id,
        refresh_token: this.createToken(dbUser),
      })
    }

    return { user: dbUser, token: token, refresh_token: refreshToken.refresh_token }
  }

  async refreshToken(user_id: number, refresh_token: string) {
    const user = await User.findOne({ where: { id: user_id }, include: [Token] })

    if(user?.token.refresh_token != refresh_token) throw new UnauthorizedError()

    const token = this.createToken(user!)

    return { token }
  }

  private createToken(user: User) {
    return jwt.sign({ user_id: user.id }, settings.SECRET, {
      expiresIn: '1h',
    })
  }
}

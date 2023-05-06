import jwt from 'jsonwebtoken'
import { User } from '@entities/user.entity'
import { HTTPError } from '@middlewares/error_handler'
import { PasswordEncrypter } from './passsword_encripter'
import { settings } from '@config/settings'
import { Roles } from '@entities/role.entity'

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

    return { user: newUser, token }
  }

  async login(email: string, password: string) {
    const dbUser = await User.findOne({ where: { email } })
    if (!dbUser) throw new HTTPError(400, 'Bad credentials')

    const match = this.passwordEncrypter.compare(password, dbUser.password)
    if (!match) throw new HTTPError(400, 'Bad credentials')

    const token = this.createToken(dbUser)

    return { user: dbUser, token: token }
  }

  async refreshToken(user_id: number) {
    const user = await User.findOne({ where: { id: user_id } })

    const token = this.createToken(user!)

    return { token }
  }

  private createToken(user: User) {
    return jwt.sign({ user_id: user.id }, settings.SECRET, {
      expiresIn: 86400,
    })
  }
}

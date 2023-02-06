import jwt from 'jsonwebtoken'
import { User } from '@entities/user.entity'
import { ErrorHandler } from '@middlewares/error_handler'
import { PasswordEncrypter } from './passsword_encripter'
import { settings } from '@config/settings'

export class AuthService {
  private passwordEncrypter: PasswordEncrypter

  constructor() {
    this.passwordEncrypter = new PasswordEncrypter()
  }

  async signup(user: User) {
    const dbUser = await User.findOne({ where: { email: user.email } })
    if (dbUser) throw new ErrorHandler(400, 'Email already exists')

    const newUser = await User.create({
      email: user.email,
      name: user.name,
      password: this.passwordEncrypter.encrypt(user.password),
    })

    const token = this.createToken(newUser)

    return { user: newUser, token }
  }

  async login(email: string, password: string) {
    const dbUser = await User.findOne({ where: { email } })
    if (!dbUser) throw new ErrorHandler(400, 'Bad credentials')

    const match = this.passwordEncrypter.compare(password, dbUser.password)
    if (!match) throw new ErrorHandler(400, 'Bad credentials')

    const token = this.createToken(dbUser)

    return { user: dbUser, token: token }
  }

  private createToken(user: User) {
    return jwt.sign({ user_id: user.user_id }, settings.SECRET, {
      expiresIn: 86400,
    })
  }
}

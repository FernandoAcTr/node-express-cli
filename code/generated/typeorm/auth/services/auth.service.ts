import jwt from 'jsonwebtoken'
import { AppDataSource } from '@database/datasources'
import { User } from '@entities/user.entity'
import { ErrorHandler } from '@middlewares/error_handler'
import { Repository } from 'typeorm'
import { PasswordEncrypter } from './passsword_encripter'
import { settings } from '@config/settings'

export class AuthService {
  private readonly repository: Repository<User>
  private passwordEncrypter: PasswordEncrypter

  constructor() {
    this.repository = AppDataSource.getRepository(User)
    this.passwordEncrypter = new PasswordEncrypter()
  }

  async signup(user: User) {
    const dbUser = await this.repository.findOne({ where: { email: user.email } })
    if (dbUser) throw new ErrorHandler(400, 'Email already exists')

    const newUser = new User()
    newUser.email = user.email
    newUser.password = this.passwordEncrypter.encrypt(user.password)
    newUser.name = user.name

    const saved = await this.repository.save(newUser)
    const token = this.createToken(saved)

    return { user: saved, token }
  }

  async login(email: string, password: string) {
    const dbUser = await this.repository.findOne({ where: { email } })
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

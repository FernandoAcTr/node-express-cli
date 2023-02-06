import { IUser, User } from '@models/user.model'
import { ErrorHandler } from '@middlewares/error_handler'

export class AuthService {
  async signup(user: IUser) {
    const dbUser = await User.findOne({ email: user.email })

    if (dbUser) throw new ErrorHandler(400, 'Email already exists')

    const newUser = new User(user)
    newUser.password = newUser.encryptPassword(user.password)

    await newUser.save()
    const token = newUser.createToken()

    return { user: newUser, token }
  }

  async login(email: string, password: string) {

    const dbUser = await User.findOne({ email })
    if (!dbUser) throw new ErrorHandler(400, 'Bad credentials')

    const match = dbUser.comparePassword(password)
    if (!match) throw new ErrorHandler(400, 'Bad credentials')

    const token = dbUser.createToken()

    return { user: dbUser, token }
  }
}

import { IUser, User } from '@models/user.model'
import { HTTPError, UnauthorizedError } from '@middlewares/error_handler'
import { Token } from '@models/token.model'

export class AuthService {
  async signup(user: IUser) {
    const dbUser = await User.findOne({ email: user.email })

    if (dbUser) throw new HTTPError(400, 'Email already exists')

    const newUser = new User(user)
    newUser.password = newUser.encryptPassword(user.password)

    await newUser.save()
    const token = newUser.createToken()
    const refreshToken = newUser.createToken()

    await Token.create({
      user_id: newUser._id,
      refresh_token: refreshToken
    })

    return { user: newUser, token: token, refresh_token: refreshToken }
  }

  async login(email: string, password: string) {

    const dbUser = await User.findOne({ email })
    if (!dbUser) throw new HTTPError(400, 'Bad credentials')

    const match = dbUser.comparePassword(password)
    if (!match) throw new HTTPError(400, 'Bad credentials')

    const token = dbUser.createToken()

    let refreshToken = await Token.findOne({ where: { user_id: dbUser._id } })
    if (!refreshToken) {
      refreshToken = await Token.create({
        user_id: dbUser._id,
        refresh_token: dbUser.createToken(),
      })
    }

    return { user: dbUser, token: token, refresh_token: refreshToken.refresh_token }
  }

  async refreshToken(user_id: number, refresh_token: string) {
    const user = await User.findOne({ _id: user_id })
    const existToken = await Token.findOne({refresh_token})

    if(!user || !existToken) throw new UnauthorizedError();

    const token = user.createToken()

    return { token }
  }
}

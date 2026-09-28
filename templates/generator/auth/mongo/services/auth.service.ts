import { IUser, User } from '@/entities/user.entity'
import { BadRequest, Unauthorized } from '@/middlewares/error_handler'
import { RefreshToken } from '@/entities/refresh_token.entity'
import { Types } from 'mongoose'

export class AuthService {
  async signup(user: IUser) {
    const dbUser = await User.findOne({ email: user.email })

    if (dbUser) throw BadRequest('Email already exists')

    const newUser = new User(user)
    newUser.password = newUser.encryptPassword(user.password)

    await newUser.save()
    const token = newUser.createToken()
    const refreshToken = newUser.createRefreshToken()

    await RefreshToken.create({
      user_id: newUser._id,
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    return { user: newUser, token: token, refresh_token: refreshToken }
  }

  async login(email: string, password: string) {
    const dbUser = await User.findOne({ email })
    if (!dbUser) throw BadRequest('Bad credentials')

    const match = dbUser.comparePassword(password)
    if (!match) throw BadRequest('Bad credentials')

    const token = dbUser.createToken()
    const refreshToken = dbUser.createRefreshToken()

    await RefreshToken.create({
      user_id: dbUser._id,
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    return { user: dbUser, token: token, refresh_token: refreshToken }
  }

  async refreshToken(user_id: string | Types.ObjectId, refresh_token: string) {
    const id = new Types.ObjectId(user_id)
    const user = await User.findOne({ _id: id })
    const token = await RefreshToken.findOne({ user_id: id, refresh_token })

    if (!user || !token) throw Unauthorized()
    if (token.expires_at < new Date()) throw Unauthorized()

    const newToken = user.createToken()
    const newRefreshToken = user.createRefreshToken()

    await RefreshToken.create({
      user_id: user._id,
      refresh_token: newRefreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    await token.deleteOne()

    return { token: newToken, refresh_token: newRefreshToken }
  }
}

export const authService = new AuthService()

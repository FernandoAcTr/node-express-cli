import { Strategy, ExtractJwt, StrategyOptions } from 'passport-jwt'
import { settings } from '@config/settings'
import { User } from '@entities/user.entity'
import { AppDataSource } from '@database/datasources'

export const JWTStrategy = new Strategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: settings.SECRET,
  },
  async (payload, done) => {
    try {
      const user = await AppDataSource.getRepository(User).findOne({ where: { user_id: payload.user_id } })
      if (user) return done(null, user)

      return done(null, false)
    } catch (error) {
      done(error, false)
    }
  }
)

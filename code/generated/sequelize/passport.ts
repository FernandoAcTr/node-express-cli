import { Strategy, ExtractJwt, StrategyOptions } from 'passport-jwt'
import { settings } from '@config/settings'
import { User } from '@entities/user.entity'

export const JWTStrategy = new Strategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: settings.SECRET,
  },
  async (payload, done) => {
    try {
      const user = await User.findOne({where: { user_id: payload.user_id }})
      if (user) return done(null, user)

      return done(null, false)
    } catch (error) {
      done(error, false)
    }
  }
)

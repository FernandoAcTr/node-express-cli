import passport from 'passport'
import { NextFunction, Request, Response } from 'express'
import { Strategy, ExtractJwt } from 'passport-jwt'
import { config } from '@/config'

export const JWTStrategy = new Strategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.SECRET,
  },
  async (payload, done) => {
    try {
      return done(null, { id: payload.user_id })
    } catch (error) {
      done(error, false)
    }
  }
)

export const authenticate = (req: Request, res: Response, next: NextFunction) =>  passport.authenticate('jwt', { session: false })

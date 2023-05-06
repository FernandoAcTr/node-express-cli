import { Strategy, ExtractJwt } from 'passport-jwt'
import { settings } from '@config/settings'
import passport from 'passport'
import jwt from 'jsonwebtoken'

export const JWTStrategy = new Strategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: settings.SECRET,
  },
  async (payload, done) => {
    try {
      return done(null, { id: payload.user_id })
    } catch (error) {
      done(error, false)
    }
  }
)

export const authenticate = (req: Request, res: Response, next: NextFunction) =>
  passport.authenticate('jwt', { session: false }, (error, user, info, status) => {
    if (info?.message == 'jwt expired') throw new HTTPError(401, 'Expired')

    if (!user) throw new UnauthorizedError()

    req.user = user
    next()
  })(req, res, next)

export const authenticateRefresh = (req: Request, res: Response, next: NextFunction) =>
  passport.authenticate('jwt', { session: false }, async (error, user, info, status) => {
    if (info?.message == 'No auth token') throw new HTTPError(401, 'Unauthorized')

    if (info?.message == 'jwt expired') {
      const token = req.headers['authorization']?.split(' ')[1]
      const payload: any = jwt.verify(token!, settings.SECRET, { ignoreExpiration: true })

      req.user = { id: payload.user_id }
      return next()
    }

    req.user = user
    next()
  })(req, res, next)
import passport from 'passport'
import { NextFunction, Request, Response } from 'express'
import { Strategy, ExtractJwt } from 'passport-jwt'
import { config } from '@/config'
import { authRepository } from '@/modules/auth/auth.repository'

interface JwtPayload {
  user_id: string | number
  type?: 'access' | 'refresh' | 'email-verification'
}

/**
 * La estrategia solo acepta access tokens y resuelve el usuario actual desde
 * el repositorio del ORM. Así un usuario borrado deja de estar autenticado y
 * `/me` no necesita volver a consultar la base de datos.
 */
export const JWTStrategy = new Strategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.SECRET,
  },
  async (payload: JwtPayload, done) => {
    try {
      if (payload.type && payload.type !== 'access') return done(null, false)

      const user = await authRepository.findUserById(payload.user_id)
      if (!user) return done(null, false)

      return done(null, user)
    } catch (error) {
      return done(error as Error, false)
    }
  }
)

export const authenticate = (req: Request, res: Response, next: NextFunction) =>
  passport.authenticate('jwt', { session: false })(req, res, next)

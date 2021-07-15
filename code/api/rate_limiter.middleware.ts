import { RateLimiterMemory } from 'rate-limiter-flexible'
import { NextFunction, Request, Response } from 'express'

const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'middleware',
  points: 5, // 5 requests
  duration: 1, // per 1 second by IP
})

export const rateLimiterMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  rateLimiter
    .consume(req.ip)
    .then(() => {
      next()
    })
    .catch(() => {
      res.status(429).send('Too Many Requests')
    })
}

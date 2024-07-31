import { NextFunction, Request, Response } from 'express'
import logger from '@/helpers/logger'

class HTTPError extends Error {
  statusCode: number
  message: string

  constructor(statusCode: number, message: string) {
    super()
    this.statusCode = statusCode
    this.message = message
  }
}
export const NotFound = (message: string = 'Not Found') => new HTTPError(404, message)
export const Unauthorized = (message: string = 'Unauthorized') => new HTTPError(401, message)
export const Forbidden = (message: string = 'Forbidden') => new HTTPError(403, message)
export const BadRequest = (message: string = 'Bad Request') => new HTTPError(400, message)
export const Conflict = (message: string = 'Conflict') => new HTTPError(409, message)
export const UnprocessableEntity = (message: string = 'Unprocessable Entity') => new HTTPError(422, message)
export const TooManyRequests = (message: string = 'Too Many Requests') => new HTTPError(429, message)
export const InternalServerError = (message: string = 'Internal Server Error') => new HTTPError(500, message)
export const ServiceUnavailable = (message: string = 'Service Unavailable') => new HTTPError(503, message)
export const GatewayTimeout = (message: string = 'Gateway Timeout') => new HTTPError(504, message)

export const handleErrorMiddleware = (err: HTTPError | Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof HTTPError) {
    const { statusCode, message } = err
    logger.error(`Error ${statusCode}: ${message}`)
    res.status(statusCode).json({
      statusCode,
      message,
    })
  } else {
    logger.error(`Server Error ${err}`)
    res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    })
  }
}

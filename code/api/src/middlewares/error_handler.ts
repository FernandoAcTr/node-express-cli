import { NextFunction, Request, Response } from 'express'
import logger from '@/helpers/logger'

export class HTTPError extends Error {
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

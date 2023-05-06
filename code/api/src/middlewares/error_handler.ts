import { NextFunction, Request, Response } from 'express'
import logger from '@helpers/logger'

export class HTTPError extends Error {
  statusCode: number
  message: string

  constructor(statusCode: number, message: string) {
    super()
    this.statusCode = statusCode
    this.message = message
  }
}
export class UnauthorizedError extends HTTPError {
  constructor() {
    super(401, 'Unauthorized')
  }
}

export const handleErrorMiddleware = (err: HTTPError | Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ErrorHandler) {
    const { statusCode, message } = err
    logger.error(`Error ${statusCode}: ${message}`)
    res.status(statusCode).json({
      statusCode,
      message,
    })
  } else {
    logger.error(`Error de servidor ${err}`)
    res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    })
  }
}

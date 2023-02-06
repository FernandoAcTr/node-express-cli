import { NextFunction, Request, Response } from 'express'
import logger from '@helpers/logger'

export class ErrorHandler extends Error {
  statusCode: number
  message: string

  constructor(statusCode: number, message: string) {
    super()
    this.statusCode = statusCode
    this.message = message
  }
}

export const handleErrorMiddleware = (err: ErrorHandler | Error, req: Request, res: Response, next: NextFunction) => {
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

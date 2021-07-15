import { NextFunction, Request, Response } from 'express'

export class ErrorHandler extends Error {
  statusCode: number
  message: string

  constructor(statusCode: number, message: string) {
    super()
    this.statusCode = statusCode
    this.message = message
  }
}

export const handleErrorMiddleware = (
  err: ErrorHandler,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { statusCode, message } = err
  res.status(statusCode).json({
    statusCode,
    message,
  })
}

import { Request, Response, NextFunction } from 'express'
import { validationResult, Result, ValidationError } from 'express-validator'

export function bodyValidator(req: Request, res: Response, next: NextFunction) {
  const errors: Result<ValidationError> = validationResult(req)

  const arrayErrors = errors.array()

  if (!errors.isEmpty()) {
    res.status(400).json({
      errors: arrayErrors,
      message: arrayErrors[0]?.msg,
    })
    return
  }

  next()
}

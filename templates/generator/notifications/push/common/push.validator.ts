import { body } from 'express-validator'
import { requestValidator } from '@/middlewares/validator'

export const subscribeValidators = [
  body('endpoint').isURL().withMessage('field endpoint must be a valid URL'),
  body('p256dh').isString().notEmpty().withMessage('field p256dh is required'),
  body('auth').isString().notEmpty().withMessage('field auth is required'),
  requestValidator,
]

export const unsubscribeValidators = [body('endpoint').isURL().withMessage('field endpoint must be a valid URL'), requestValidator]

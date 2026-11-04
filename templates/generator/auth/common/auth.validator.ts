import { check } from 'express-validator'
import { requestValidator } from '@/middlewares/validator'

export const registerValidators = [
  check('name').isString().trim().notEmpty().withMessage('field name is required'),
  check('email').isEmail().withMessage('field email is required'),
  check('password').isString().isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
  check('password_confirmation')
    .optional()
    .custom((value, { req }) => value === req.body.password)
    .withMessage('password confirmation does not match'),
  requestValidator,
]

export const loginValidators = [
  check('email').isEmail().withMessage('field email is required'),
  check('password').isString().notEmpty().withMessage('field password is required'),
  requestValidator,
]

export const refreshTokenValidators = [
  check('refresh_token').isString().notEmpty().withMessage('field refresh_token is required'),
  requestValidator,
]

export const forgotPasswordValidators = [check('email').isEmail().withMessage('field email is required'), requestValidator]

export const resetPasswordValidators = [
  check('email').isEmail().withMessage('field email is required'),
  check('token').isString().notEmpty().withMessage('field token is required'),
  check('password').isString().isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
  check('password_confirmation')
    .isString()
    .custom((value, { req }) => value === req.body.password)
    .withMessage('password confirmation does not match'),
  requestValidator,
]

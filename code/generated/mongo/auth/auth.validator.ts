import { check } from 'express-validator'

export const signupValidators = [
  check('name').notEmpty().withMessage('field name is required'),
  check('email').notEmpty().isEmail().withMessage('field email is required'),
  check('password')
    .notEmpty()
    .withMessage('field password is required')
    .isLength({ min: 8 })
    .withMessage('password must be at least 8 characters'),
]

export const loginValidators = [
  check('email').notEmpty().withMessage('field email is required'),
  check('password').notEmpty().withMessage('field password is required'),
]

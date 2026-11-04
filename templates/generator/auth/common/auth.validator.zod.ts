import { z } from 'zod'
import { validate } from '@/middlewares/validator'

const passwordSchema = z.string('password must be at least 8 characters').min(8, 'password must be at least 8 characters')

export const registerSchema = z
  .object({
    name: z.string('field name is required').trim().min(1, 'field name is required'),
    email: z.email('field email is required'),
    password: passwordSchema,
    password_confirmation: z.string('password confirmation does not match').optional(),
  })
  .refine((data) => data.password_confirmation === undefined || data.password_confirmation === data.password, {
    message: 'password confirmation does not match',
    path: ['password_confirmation'],
  })

export const registerValidators = [validate(registerSchema)]

export const loginSchema = z.object({
  email: z.email('field email is required'),
  password: z.string('field password is required').min(1, 'field password is required'),
})

export const loginValidators = [validate(loginSchema)]

export const refreshTokenSchema = z.object({
  refresh_token: z.string('field refresh_token is required').min(1, 'field refresh_token is required'),
})

export const refreshTokenValidators = [validate(refreshTokenSchema)]

export const forgotPasswordSchema = z.object({
  email: z.email('field email is required'),
})

export const forgotPasswordValidators = [validate(forgotPasswordSchema)]

export const resetPasswordSchema = z
  .object({
    email: z.email('field email is required'),
    token: z.string('field token is required').min(1, 'field token is required'),
    password: passwordSchema,
    password_confirmation: z.string('password confirmation does not match'),
  })
  .refine((data) => data.password_confirmation === data.password, {
    message: 'password confirmation does not match',
    path: ['password_confirmation'],
  })

export const resetPasswordValidators = [validate(resetPasswordSchema)]

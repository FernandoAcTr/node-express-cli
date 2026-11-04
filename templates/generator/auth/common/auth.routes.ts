import { Router } from 'express'
import * as Controller from '@/modules/auth/auth.controller'
import {
  forgotPasswordValidators,
  loginValidators,
  refreshTokenValidators,
  registerValidators,
  resetPasswordValidators,
} from '@/modules/auth/auth.validator'
import { authenticate } from '@/middlewares/passport'

const router = Router()

export const PREFIX = '/auth'

router.post('/register', [...registerValidators], Controller.signup)
//
router.post('/signup', [...registerValidators], Controller.signup)
//
router.post('/login', [...loginValidators], Controller.login)
//
router.post('/logout', authenticate, Controller.logout)
//
router.post('/refresh-token', [...refreshTokenValidators], Controller.refreshToken)
//
router.post('/refresh', [...refreshTokenValidators], Controller.refreshToken)
//
router.post('/forgot-password', [...forgotPasswordValidators], Controller.forgotPassword)
//
router.post('/reset-password', [...resetPasswordValidators], Controller.resetPassword)
//
router.post('/resend-verification', authenticate, Controller.resendVerification)
//
router.get('/verify-email/:id/:token', Controller.verifyEmail)
//
router.get('/me', authenticate, Controller.me)

export default router

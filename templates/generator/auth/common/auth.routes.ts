import { Router } from 'express'
import * as Controller from '@/modules/auth/auth.controller'
import { loginValidators, signupValidators } from '@/modules/auth/auth.validator'
import { authenticate } from '@/middlewares/passport'

const router = Router()

export const PREFIX = '/auth'

router.post('/signup', [...signupValidators], Controller.signup)
//
router.post('/login', [...loginValidators], Controller.login)
//
router.post('/refresh-token', authenticate, Controller.refreshToken)

export default router

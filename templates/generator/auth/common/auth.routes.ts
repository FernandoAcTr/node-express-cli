import { Router } from 'express'
import * as Controller from '@/modules/auth/auth.controller'
import { loginValidators, signupValidators } from '@/modules/auth/auth.validator'
import { authenticate } from '@/middlewares/passport'

const router = Router()

router.post('/auth/signup', [...signupValidators], Controller.signup)
//
router.post('/auth/login', [...loginValidators], Controller.login)
//
router.post('/auth/refresh-token', authenticate, Controller.refreshToken)

export default router

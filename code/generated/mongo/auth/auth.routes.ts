import { Router } from 'express'
import * as Controller from './auth.controller'
import { loginValidators, signupValidators } from './auth.validator'
import { authenticateRefresh } from '@/middlewares/passport'

const router = Router()

router.post('/signup', [...signupValidators], Controller.signup)
//
router.post('/login', [...loginValidators], Controller.login)
//
router.post('/refresh-token', authenticateRefresh, Controller.refreshToken)

export default router

import { Router } from 'express'
import * as Controller from './auth.controller'
import { loginValidators, signupValidators } from './auth.validator'
import { validateBody } from '@middlewares/validator'

const router = Router()

router.post('/signup', [...signupValidators, validateBody], Controller.signup)
//
router.post('/login', [...loginValidators, validateBody], Controller.login)

export default router

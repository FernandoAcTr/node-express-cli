import { signupValidators } from '@/modules/auth/auth.validator'
import * as Controller from '@/modules/auth/auth.controller'

export default {
  POST: [...signupValidators, Controller.signup],
} satisfies RestController

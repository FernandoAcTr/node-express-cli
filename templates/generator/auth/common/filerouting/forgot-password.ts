import * as Controller from '@/modules/auth/auth.controller'
import { forgotPasswordValidators } from '@/modules/auth/auth.validator'

export default {
  POST: [...forgotPasswordValidators, Controller.forgotPassword],
} satisfies RestController

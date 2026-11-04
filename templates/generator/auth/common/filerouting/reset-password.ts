import * as Controller from '@/modules/auth/auth.controller'
import { resetPasswordValidators } from '@/modules/auth/auth.validator'

export default {
  POST: [...resetPasswordValidators, Controller.resetPassword],
} satisfies RestController

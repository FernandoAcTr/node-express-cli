import * as Controller from '@/modules/auth/auth.controller'
import { registerValidators } from '@/modules/auth/auth.validator'

export default {
  POST: [...registerValidators, Controller.signup],
} satisfies RestController

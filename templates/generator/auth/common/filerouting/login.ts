import * as Controller from '@/modules/auth/auth.controller'
import { loginValidators } from '@/modules/auth/auth.validator'

export default {
  POST: [...loginValidators, Controller.login],
} satisfies RestController

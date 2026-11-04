import * as Controller from '@/modules/auth/auth.controller'
import { refreshTokenValidators } from '@/modules/auth/auth.validator'

export default {
  POST: [...refreshTokenValidators, Controller.refreshToken],
} satisfies RestController

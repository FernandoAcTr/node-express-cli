import * as Controller from '@/modules/auth/auth.controller'

export default {
  POST: [Controller.refreshToken],
} satisfies RestController

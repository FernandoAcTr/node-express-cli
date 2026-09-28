import * as Controller from '@/modules/auth/auth.controller'
import { authenticate } from '@/middlewares/passport'

export default {
  POST: [authenticate, Controller.refreshToken],
} satisfies RestController

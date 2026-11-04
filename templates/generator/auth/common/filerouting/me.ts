import * as Controller from '@/modules/auth/auth.controller'
import { authenticate } from '@/middlewares/passport'

export default {
  GET: [authenticate, Controller.me],
} satisfies RestController

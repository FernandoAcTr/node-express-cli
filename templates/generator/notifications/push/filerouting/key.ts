import * as Controller from '@/modules/notifications/push/push.controller'
import { authenticate } from '@/middlewares/passport'

export default {
  GET: [authenticate, Controller.key],
} satisfies RestController

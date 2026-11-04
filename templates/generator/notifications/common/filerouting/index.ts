import * as Controller from '@/modules/notifications/notifications.controller'
import { authenticate } from '@/middlewares/passport'

export default {
  GET: [authenticate, Controller.index],
} satisfies RestController

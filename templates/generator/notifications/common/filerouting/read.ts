import * as Controller from '@/modules/notifications/notifications.controller'
import { authenticate } from '@/middlewares/passport'

export default {
  POST: [authenticate, Controller.markAllAsRead],
} satisfies RestController

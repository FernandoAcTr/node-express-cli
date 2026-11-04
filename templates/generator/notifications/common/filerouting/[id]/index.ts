import * as Controller from '@/modules/notifications/notifications.controller'
import { notificationIdValidators } from '@/modules/notifications/notifications.validator'
import { authenticate } from '@/middlewares/passport'

export default {
  GET: [authenticate, ...notificationIdValidators, Controller.show],
  DELETE: [authenticate, ...notificationIdValidators, Controller.destroy],
} satisfies RestController

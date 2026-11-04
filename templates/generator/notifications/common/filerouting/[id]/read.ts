import * as Controller from '@/modules/notifications/notifications.controller'
import { notificationIdValidators } from '@/modules/notifications/notifications.validator'
import { authenticate } from '@/middlewares/passport'

export default {
  POST: [authenticate, ...notificationIdValidators, Controller.markAsRead],
} satisfies RestController

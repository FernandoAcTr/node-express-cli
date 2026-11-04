import * as Controller from '@/modules/notifications/push/push.controller'
import { unsubscribeValidators } from '@/modules/notifications/push/push.validator'
import { authenticate } from '@/middlewares/passport'

export default {
  POST: [authenticate, ...unsubscribeValidators, Controller.destroy],
} satisfies RestController

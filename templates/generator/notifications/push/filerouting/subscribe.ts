import * as Controller from '@/modules/notifications/push/push.controller'
import { subscribeValidators } from '@/modules/notifications/push/push.validator'
import { authenticate } from '@/middlewares/passport'

export default {
  POST: [authenticate, ...subscribeValidators, Controller.store],
} satisfies RestController

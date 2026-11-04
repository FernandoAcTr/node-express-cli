import * as Controller from '@/modules/auth/auth.controller'

export default {
  GET: Controller.verifyEmail,
} satisfies RestController

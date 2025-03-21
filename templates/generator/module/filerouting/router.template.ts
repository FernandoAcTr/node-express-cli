import * as Controller from '@/modules/__modulename__/__modulename__.controller'
import { storeValidators } from '@/modules/__modulename__/__modulename__.validator'

export default {
  GET: Controller.index,
  POST: [...storeValidators, Controller.store],
} satisfies RestController

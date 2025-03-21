import * as Controller from '@/modules/__modulename__/__modulename__.controller'
import { updateValidators } from '@/modules/__modulename__/__modulename__.validator'

export default {
  GET: Controller.show,
  PUT: [...updateValidators, Controller.update],
  DELETE: Controller.destroy,
} satisfies RestController

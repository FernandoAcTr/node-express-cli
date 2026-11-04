import { Router } from 'express'
import * as Controller from '@/modules/notifications/push/push.controller'
import { subscribeValidators, unsubscribeValidators } from '@/modules/notifications/push/push.validator'
import { authenticate } from '@/middlewares/passport'

const router = Router()

export const PREFIX = '/notifications/push'

router.get('/key', authenticate, Controller.key)
//
router.post('/subscribe', authenticate, subscribeValidators, Controller.store)
//
router.post('/unsubscribe', authenticate, unsubscribeValidators, Controller.destroy)

export default router

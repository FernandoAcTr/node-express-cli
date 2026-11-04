import { Router } from 'express'
import * as Controller from '@/modules/notifications/notifications.controller'
import { notificationIdValidators } from '@/modules/notifications/notifications.validator'
import { authenticate } from '@/middlewares/passport'

const router = Router()

export const PREFIX = '/notifications'

router.get('/', authenticate, Controller.index)
//
router.get('/count', authenticate, Controller.count)
//
router.get('/:id', authenticate, notificationIdValidators, Controller.show)
//
router.post('/read', authenticate, Controller.markAllAsRead)
//
router.post('/:id/read', authenticate, notificationIdValidators, Controller.markAsRead)
//
router.delete('/:id', authenticate, notificationIdValidators, Controller.destroy)

export default router

import { z } from 'zod'
import { validate } from '@/middlewares/validator'

export const notificationIdSchema = z.string('field id is required').trim().min(1, 'field id is required')

export const notificationIdValidators = [validate(notificationIdSchema, 'params')]

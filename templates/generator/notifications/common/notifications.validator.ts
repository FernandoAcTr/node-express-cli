import { check } from 'express-validator'
import { requestValidator } from '@/middlewares/validator'

export const notificationIdValidators = [check('id').isString().trim().notEmpty().withMessage('field id is required'), requestValidator]

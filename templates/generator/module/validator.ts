import { requestValidator } from '@/middlewares/validator'
import { check } from 'express-validator'

export const storeValidators = [requestValidator]

export const updateValidators = [requestValidator]

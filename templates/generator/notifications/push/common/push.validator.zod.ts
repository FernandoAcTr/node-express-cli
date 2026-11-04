import { z } from 'zod'
import { validate } from '@/middlewares/validator'

export const subscribeSchema = z.object({
  endpoint: z.url('field endpoint must be a valid URL'),
  p256dh: z.string('field p256dh is required').min(1, 'field p256dh is required'),
  auth: z.string('field auth is required').min(1, 'field auth is required'),
})

export const subscribeValidators = [validate(subscribeSchema)]

export const unsubscribeSchema = z.object({
  endpoint: z.url('field endpoint must be a valid URL'),
})

export const unsubscribeValidators = [validate(unsubscribeSchema)]

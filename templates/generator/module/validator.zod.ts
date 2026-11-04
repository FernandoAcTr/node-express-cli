import { z } from 'zod'
import { validate } from '@/middlewares/validator'

// Define the fields accepted by this endpoint, for example:
// name: z.string().min(3, 'field name must have at least 3 characters')
//
// While the schema is empty, `.optional()` allows requests without a body.
// Remove it once you add fields.
export const storeSchema = z.object({
  //
})

export const updateSchema = storeSchema.partial()

export const storeValidators = [validate(storeSchema.optional())]

export const updateValidators = [validate(updateSchema.optional())]

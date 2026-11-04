import { NextFunction, Request, RequestHandler, Response } from 'express'
import { z } from 'zod'

export type ValidationSource = 'body' | 'query' | 'params'

/**
 * Validates the request with a Zod schema and responds with the same shape as
 * the express-validator `requestValidator`: `{ errors, message }`.
 *
 * It only validates: it does not replace `req.body`, `req.query` or
 * `req.params`. If you need the transformed data, call `schema.parse` again
 * in the controller or use `validate` as a reference for your own middleware.
 */
export function validate(schema: z.ZodType, source: ValidationSource = 'body'): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      const input = req[source]
      const errors = result.error.issues.map((issue) => ({
        type: 'field',
        value: readPath(input, issue.path),
        msg: issue.message,
        path: issue.path.join('.'),
        location: source,
      }))

      res.status(400).json({
        errors,
        message: errors[0]?.msg,
      })

      return
    }

    next()
  }
}

function readPath(source: unknown, path: PropertyKey[]): unknown {
  return path.reduce<unknown>((value, key) => {
    if (value === null || typeof value !== 'object') {
      return undefined
    }

    return (value as Record<PropertyKey, unknown>)[key]
  }, source)
}

import { ValidationLibrary } from '../types'

/**
 * Rutas de las plantillas de validación para cada librería. Es la única pieza
 * del CLI que conoce las diferencias entre ambas: los generadores solo piden
 * el archivo que necesitan.
 */
export interface ValidationTemplates {
  /** Middleware que se copia a `src/middlewares/validator.ts` en `init`. */
  middleware: string
  module: string
  auth: string
  notifications: string
  push: string
}

export const VALIDATION_TEMPLATES: Record<ValidationLibrary, ValidationTemplates> = {
  [ValidationLibrary.EXPRESS_VALIDATOR]: {
    middleware: 'generator/validation/express-validator/validator.ts',
    module: 'generator/module/validator.ts',
    auth: 'generator/auth/common/auth.validator.ts',
    notifications: 'generator/notifications/common/notifications.validator.ts',
    push: 'generator/notifications/push/common/push.validator.ts',
  },
  [ValidationLibrary.ZOD]: {
    middleware: 'generator/validation/zod/validator.ts',
    module: 'generator/module/validator.zod.ts',
    auth: 'generator/auth/common/auth.validator.zod.ts',
    notifications: 'generator/notifications/common/notifications.validator.zod.ts',
    push: 'generator/notifications/push/common/push.validator.zod.ts',
  },
}

/**
 * Proyectos generados antes de que existiera la clave `validation` no la
 * tienen en `cli.config.json`; `ConfigService` ya devuelve express-validator,
 * pero el fallback protege también a los generadores usados con contextos
 * construidos a mano en tests.
 */
export function validationTemplates(library: ValidationLibrary | undefined): ValidationTemplates {
  return VALIDATION_TEMPLATES[library ?? ValidationLibrary.EXPRESS_VALIDATOR] ?? VALIDATION_TEMPLATES[ValidationLibrary.EXPRESS_VALIDATOR]
}

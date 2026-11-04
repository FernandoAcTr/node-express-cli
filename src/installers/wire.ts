import { ConfigService } from '../services/config.service'
import { WiringService } from '../wiring'
import { SpecValue, WireStep } from './spec'

/** Resuelve los valores que dependen del package manager. */
export function resolveSpecValue(value: SpecValue, config: ConfigService): string {
  return typeof value === 'function' ? value(config) : value
}

/**
 * Traduce pasos declarativos a llamadas de `WiringService`. Se ejecuta dentro de
 * `wiring.transaction(...)` para que los parches de un mismo archivo sean
 * atómicos.
 */
export function applyWireSteps(wiring: WiringService, steps: WireStep[], config: ConfigService): void {
  for (const step of steps) {
    switch (step.kind) {
      case 'import':
        wiring.import(step.statement, { key: step.key, position: step.position, sort: step.sort })
        break
      case 'main':
        wiring.main(step.anchor, step.code, { key: step.key, position: step.position })
        break
      case 'config':
        wiring.config(resolveSpecValue(step.code, config), { key: step.key, position: step.position })
        break
      case 'env':
        wiring.env(resolveSpecValue(step.code, config), { key: step.key, position: step.position })
        break
      case 'envBlock':
        wiring.envBlock(step.marker, resolveSpecValue(step.code, config), { key: step.key })
        break
      case 'block':
        wiring.block(step.file, step.marker, resolveSpecValue(step.code, config), {
          key: step.key,
          after: step.after,
          comment: step.comment,
        })
        break
    }
  }
}

/** Los pasos de `main.ts` se aplican juntos antes de config/env/scripts. */
export function isMainStep(step: WireStep): boolean {
  return step.kind === 'import' || step.kind === 'main'
}

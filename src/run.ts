import { Lifecycle } from './interfaces/generator.interface'
import { Context } from './context'
import { Feature, FeatureMetadata } from './types'

export interface RunOptions {
  ctx?: Context
  /** Feature que se registra en cli.config.json si todas las fases terminan bien. */
  feature?: Feature
  /** Metadata extra que se persiste junto con la feature. */
  metadata?: FeatureMetadata
}

/**
 * Pipeline fijo del ciclo de vida. Solo se ejecutan las fases que el generador
 * implementa; los errores se propagan a `main().catch(handleError)`.
 */
export async function run(generator: Lifecycle, options: RunOptions = {}): Promise<void> {
  try {
    await generator.pre?.()
    await generator.createDirectories?.()
    await generator.copyFiles?.()
    await generator.installDependencies?.()
    await generator.post?.()
    await generator.run?.()
  } catch (error) {
    await generator.rollback?.()
    throw error
  }

  if (options.ctx && options.feature) {
    // La metadata del generador y la feature se escriben juntas al final: si
    // una fase falla no queda estado a medias en cli.config.json.
    options.ctx.markInstalled(options.feature, options.metadata ?? generator.installMetadata?.())
  }
}

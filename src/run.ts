import { Lifecycle } from './interfaces/generator.interface'
import { Context } from './context'
import { OperationResult } from './report'
import { Feature, FeatureMetadata } from './types'

export interface RunOptions {
  ctx?: Context
  /** Feature que se registra en cli.config.json si todas las fases terminan bien y no hubo warnings de wiring. */
  feature?: Feature
  /** Metadata extra que se persiste junto con la feature. */
  metadata?: FeatureMetadata
}

/**
 * Pipeline fijo del ciclo de vida. Solo se ejecutan las fases que el generador
 * implementa; los errores se propagan a `main().catch(handleError)`.
 */
export async function run(generator: Lifecycle, options: RunOptions = {}): Promise<void> {
  let postResult: OperationResult | undefined

  try {
    await generator.pre?.()
    await generator.createDirectories?.()
    await generator.copyFiles?.()
    await generator.installDependencies?.()
    postResult = (await generator.post?.()) ?? undefined
    await generator.run?.()
  } catch (error) {
    await generator.rollback?.()
    throw error
  }

  if (options.ctx && options.feature) {
    // Un warning de wiring significa que la feature quedó desconectada. No se
    // marca como instalada para que `ctx.has()` y los `requires` no mientan.
    if ((postResult?.warnings.length ?? 0) > 0) {
      const alreadyInstalled = options.ctx.has(options.feature)

      options.ctx.logger.warn(
        alreadyInstalled
          ? `Feature "${options.feature}" remains marked as installed, but the wiring is incomplete. Fix the warnings above and run the command again.`
          : `Feature "${options.feature}" was not marked as installed because the wiring is incomplete. Fix the warnings above and run the command again.`
      )
      return
    }

    // La metadata del generador y la feature se escriben juntas al final: si
    // una fase falla no queda estado a medias en cli.config.json.
    options.ctx.markInstalled(options.feature, options.metadata ?? generator.installMetadata?.())
  }
}

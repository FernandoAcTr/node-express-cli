import { Command, Generator } from './interfaces/generator.interface'
import { Context } from './context'
import { Feature } from './types'

interface Lifecycle {
  pre?(): Promise<void>
  createDirectories?(): Promise<void>
  copyFiles?(): Promise<void>
  installDependencies?(): Promise<void>
  post?(): Promise<void>
  run?(): Promise<void>
}

export interface RunOptions {
  ctx?: Context
  /** Feature que se registra en cli.config.json si todas las fases terminan bien. */
  feature?: Feature
}

/**
 * Pipeline fijo del ciclo de vida. Solo se ejecutan las fases que el generador
 * implementa; los errores se propagan a `main().catch(handleError)`.
 */
export async function run(generator: Generator | Command, options: RunOptions = {}): Promise<void> {
  const lifecycle = generator as Lifecycle

  await lifecycle.pre?.()
  await lifecycle.createDirectories?.()
  await lifecycle.copyFiles?.()
  await lifecycle.installDependencies?.()
  await lifecycle.post?.()
  await lifecycle.run?.()

  if (options.ctx && options.feature) {
    options.ctx.markInstalled(options.feature)
  }
}

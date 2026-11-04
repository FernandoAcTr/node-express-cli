import fs from 'fs-extra'
import { ConfigService } from './services/config.service'
import { ProjectService } from './services/project.service'
import { ShellService } from './services/shell.service'
import { Logger, consoleLogger } from './logger'
import { InquirerPrompter, Prompter } from './prompts'
import { Feature } from './types'
import { WiringService } from './wiring'

export type ContextFeature = Feature | 'fileBasedRouting'

export interface Context {
  cwd: string
  config: ConfigService
  project: ProjectService
  wiring: WiringService
  shell: ShellService
  fs: typeof fs
  logger: Logger
  prompter: Prompter
  /** True si el usuario pasó `--force`. */
  force: boolean
  /** True si la feature está instalada o si el estado del proyecto la implica. */
  has(feature: ContextFeature): boolean
  /** Registra una feature en `cli.config.json` al terminar una instalación. */
  markInstalled(feature: Feature): void
}

export interface CreateContextOptions {
  cwd?: string
  config?: ConfigService
  project?: ProjectService
  wiring?: WiringService
  shell?: ShellService
  fs?: typeof fs
  logger?: Logger
  prompter?: Prompter
  force?: boolean
}

/**
 * Construye el contexto que reciben todos los generadores. En tests se puede
 * pasar un Context completo o sustituir solo las piezas necesarias.
 */
export function createContext(options: CreateContextOptions = {}): Context {
  const config = options.config ?? new ConfigService(options.cwd ?? process.cwd())
  const cwd = options.cwd ?? config.cwd
  const shell = options.shell ?? new ShellService()
  const logger = options.logger ?? consoleLogger
  const prompter = options.prompter ?? new InquirerPrompter()
  const force = options.force ?? false
  const project = options.project ?? new ProjectService(cwd, { force, logger, fs: options.fs })
  const wiring =
    options.wiring ??
    new WiringService({
      cwd,
      config,
      project,
    })

  return {
    cwd,
    config,
    project,
    wiring,
    shell,
    fs: options.fs ?? fs,
    logger,
    prompter,
    force,
    has(feature: ContextFeature): boolean {
      const current = config.getConfig()

      if (current.features.includes(feature)) {
        return true
      }

      // Compatibilidad con proyectos anteriores a `features`.
      switch (feature) {
        case 'orm':
          return Boolean(current.orm)
        case 'fileBasedRouting':
          return Boolean(current.fileBasedRouting)
        default:
          return false
      }
    },
    markInstalled(feature: Feature): void {
      config.markFeature(feature)
    },
  }
}

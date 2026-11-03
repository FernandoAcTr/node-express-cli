import fs from 'fs-extra'
import { ConfigService } from './services/config.service'
import { ShellService } from './services/shell.service'
import { Logger, consoleLogger } from './logger'
import { InquirerPrompter, Prompter } from './prompts'
import { Config } from './types'

export type ContextFeature = 'orm' | 'fileBasedRouting'

export interface Context {
  cwd: string
  config: ConfigService
  shell: ShellService
  fs: typeof fs
  logger: Logger
  prompter: Prompter
  has(feature: ContextFeature): boolean
}

export interface CreateContextOptions {
  cwd?: string
  config?: ConfigService
  shell?: ShellService
  fs?: typeof fs
  logger?: Logger
  prompter?: Prompter
}

/**
 * Construye el contexto que reciben todos los generadores. En tests se puede
 * pasar un Context completo o sustituir solo las piezas necesarias.
 */
export function createContext(options: CreateContextOptions = {}): Context {
  const cwd = options.cwd ?? process.cwd()
  const config = options.config ?? new ConfigService(cwd)
  const shell = options.shell ?? new ShellService()
  const logger = options.logger ?? consoleLogger
  const prompter = options.prompter ?? new InquirerPrompter()

  return {
    cwd,
    config,
    shell,
    fs: options.fs ?? fs,
    logger,
    prompter,
    has(feature: ContextFeature): boolean {
      const current: Config = config.getConfig()

      switch (feature) {
        case 'orm':
          return Boolean(current.orm)
        case 'fileBasedRouting':
          return Boolean(current.fileBasedRouting)
        default:
          return false
      }
    },
  }
}

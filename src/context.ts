import fs from 'fs-extra'
import { ConfigService } from './services/config.service'
import { FileSystem, VirtualFileSystem } from './services/file-system'
import { ProjectService } from './services/project.service'
import { ShellService } from './services/shell.service'
import { Logger, consoleLogger } from './logger'
import { InquirerPrompter, Prompter } from './prompts'
import { CommandArgs, ContextFeature, Feature, FeatureMetadata } from './types'
import { booleanFlag } from './utils/args'
import { WiringService } from './wiring'
import { PatchFileSystem } from './patch/anchor'

export type { ContextFeature } from './types'

export interface Context {
  cwd: string
  config: ConfigService
  project: ProjectService
  wiring: WiringService
  shell: ShellService
  fs: FileSystem
  logger: Logger
  prompter: Prompter
  /** Argumentos parseados del comando; los flags llegan como `args.flags`. */
  args: CommandArgs
  /** True si el usuario pasó `--force`. */
  force: boolean
  /** True si el usuario pasó `--dry-run`; no se escribe nada en el proyecto. */
  dryRun: boolean
  /** True si la feature está instalada o si el estado del proyecto la implica. */
  has(feature: ContextFeature): boolean
  /** Registra una feature (y su metadata) en `cli.config.json` al terminar. */
  markInstalled(feature: Feature, metadata?: FeatureMetadata): void
}

export interface CreateContextOptions {
  cwd?: string
  config?: ConfigService
  project?: ProjectService
  wiring?: WiringService
  shell?: ShellService
  fs?: FileSystem
  logger?: Logger
  prompter?: Prompter
  args?: CommandArgs
  force?: boolean
  dryRun?: boolean
}

/**
 * Construye el contexto que reciben todos los generadores. En tests se puede
 * pasar un Context completo o sustituir solo las piezas necesarias.
 */
export function createContext(options: CreateContextOptions = {}): Context {
  const logger = options.logger ?? consoleLogger
  const args = options.args ?? { positionals: [], flags: {} }
  const force = options.force ?? booleanFlag(args, 'force')
  const dryRun = options.dryRun ?? booleanFlag(args, 'dry-run')
  const baseCwd = options.cwd ?? options.config?.cwd ?? process.cwd()
  const fileSystem: FileSystem = options.fs ?? (dryRun ? new VirtualFileSystem(fs, logger, baseCwd) : fs)
  const config = options.config ?? new ConfigService(baseCwd, { fs: fileSystem })
  const cwd = options.cwd ?? config.cwd
  const shell = options.shell ?? new ShellService({ dryRun, logger })
  const prompter = options.prompter ?? new InquirerPrompter()
  const project = options.project ?? new ProjectService(cwd, { force, logger, fs: fileSystem })
  const wiring =
    options.wiring ??
    new WiringService({
      cwd,
      config,
      project,
      fs: patchFileSystem(fileSystem),
    })

  const legacyWarnings = new Set<ContextFeature>()

  return {
    cwd,
    config,
    project,
    wiring,
    shell,
    fs: fileSystem,
    logger,
    prompter,
    args,
    force,
    dryRun,
    has(feature: ContextFeature): boolean {
      const current = config.getConfig()

      if (feature === 'fileBasedRouting') {
        return Boolean(current.fileBasedRouting)
      }

      if (current.features.includes(feature)) {
        return true
      }

      // Proyectos anteriores a `features`: el ORM configurado sigue siendo una
      // señal válida, pero avisamos una sola vez para que el usuario pueda
      // regularizar el estado con `install:orm`.
      if (feature === 'orm' && current.orm) {
        if (!legacyWarnings.has('orm')) {
          legacyWarnings.add('orm')
          logger.warn(
            'cli.config.json has an ORM but does not list the "orm" feature; treating it as installed. Run "install:orm" to update the project state.'
          )
        }

        return true
      }

      return false
    },
    markInstalled(feature: Feature, metadata?: FeatureMetadata): void {
      config.markFeature(feature, metadata)
      // `markFeature` escribe cli.config.json fuera de ProjectService; sin este
      // record el manifest conservaría el hash anterior y el archivo parecería
      // modificado por el usuario en la siguiente ejecución.
      project.record('cli.config.json')
    },
  }
}

/** Adapta el FS del proyecto a la superficie que usa el motor de patches. */
function patchFileSystem(fileSystem: FileSystem): PatchFileSystem {
  return {
    existsSync: (file) => fileSystem.existsSync(file),
    readFileSync: (file) => fileSystem.readFileSync(file, 'utf-8'),
    writeFileSync: (file, content) => fileSystem.writeFileSync(file, content),
  }
}

import { OperationResult } from '../report'
import { FeatureMetadata } from '../types'

export interface IFileSystemGenerator {
  createDirectories(): Promise<void>
  copyFiles(): Promise<void>
}

export interface IPreGenerator {
  pre(): Promise<void>
}

export interface IPostGenerator {
  /**
   * `post` puede devolver el resultado del wiring. Si incluye warnings, `run()`
   * NO marca la feature como instalada: el proyecto quedaría con estado falso.
   */
  post(): Promise<void | OperationResult>
}

export interface IInstallerGenerator {
  installDependencies(): Promise<void>
}

export interface Command {
  run(): Promise<void>
}

export interface IGenerator extends IFileSystemGenerator, IPreGenerator, IPostGenerator, IInstallerGenerator {}

/**
 * Contrato del ciclo de vida que ejecuta `run()`. Todas las fases son opcionales:
 * un generador implementa solo las que necesita. `installMetadata` permite que
 * `run()` persista estado junto con la feature en una sola escritura.
 */
export interface Lifecycle {
  pre?(): Promise<void>
  createDirectories?(): Promise<void>
  copyFiles?(): Promise<void>
  installDependencies?(): Promise<void>
  /**
   * Puede devolver el resultado del wiring. Un resultado con warnings impide
   * que `run()` persista la feature: el estado debe reflejar lo que funciona.
   */
  post?(): Promise<void | OperationResult>
  run?(): Promise<void>
  /** Limpieza opcional si una fase falla (p. ej. borrar un proyecto a medias). */
  rollback?(): Promise<void> | void
  /** Metadata que se registra en `cli.config.json` junto con la feature. */
  installMetadata?(): FeatureMetadata | undefined
}

export type Generator = IFileSystemGenerator | IPreGenerator | IPostGenerator | IInstallerGenerator

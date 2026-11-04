import { Context } from '../context'
import { IFileSystemGenerator, IInstallerGenerator, IPostGenerator } from '../interfaces/generator.interface'
import { OperationResult, Reporter, createResult } from '../report'
import { InstallerSpec } from './spec'
import { applyWireSteps, isMainStep } from './wire'

/**
 * Lifecycle genérico para instaladores declarativos.
 *
 * Un `install:*` simple solo necesita un `InstallerSpec` y una entrada
 * `installer(spec)` en el registry. Los instaladores con lógica propia (auth,
 * orm, migration) siguen siendo generadores custom.
 */
export class SpecGenerator implements IFileSystemGenerator, IInstallerGenerator, IPostGenerator {
  constructor(
    private readonly ctx: Context,
    private readonly spec: InstallerSpec
  ) {}

  async createDirectories(): Promise<void> {
    for (const dir of this.spec.dirs ?? []) {
      this.ctx.project.ensureDir(dir)
    }
  }

  async copyFiles(): Promise<void> {
    this.copyStage('copyFiles')
  }

  async installDependencies(): Promise<void> {
    const deps = this.spec.deps ?? []
    const devDeps = this.spec.devDeps ?? []

    if (deps.length === 0 && devDeps.length === 0) {
      return
    }

    if (this.ctx.has(this.spec.feature)) {
      this.ctx.logger.info(`${this.spec.feature} is already installed; skipping dependency installation`)
      return
    }

    this.ctx.logger.info(`================= Installing ${this.spec.feature} =================`)

    if (deps.length > 0) {
      await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} ${deps.join(' ')}`, this.ctx.cwd)
    }

    if (devDeps.length > 0) {
      await this.ctx.shell.execAsync(`${this.ctx.config.getDevInstallCommand()} ${devDeps.join(' ')}`, this.ctx.cwd)
    }

    // El package manager escribe package.json; registrar el archivo mantiene el
    // manifest alineado con lo que hay en disco.
    this.ctx.project.record('package.json')
  }

  async post(): Promise<OperationResult> {
    const reporter = new Reporter(this.ctx.logger, this.spec.skippedSuffix)
    const result = createResult()
    const steps = this.spec.wire ?? []
    const mainSteps = steps.filter(isMainStep)
    const otherSteps = steps.filter((step) => !isMainStep(step))

    // Primero `main.ts`: si falta un anchor, no tiene sentido escribir config,
    // env o scripts de una feature que quedaría desconectada.
    if (mainSteps.length > 0) {
      const mainResult = this.ctx.wiring.transaction((wiring) => applyWireSteps(wiring, mainSteps, this.ctx.config))
      this.merge(reporter, result, mainResult)

      if (mainResult.warnings.length > 0) {
        return result
      }
    }

    if (otherSteps.length > 0) {
      const otherResult = this.ctx.wiring.transaction((wiring) => applyWireSteps(wiring, otherSteps, this.ctx.config))
      this.merge(reporter, result, otherResult)

      if (otherResult.warnings.length > 0) {
        return result
      }
    }

    this.copyStage('post')

    if (this.spec.scripts) {
      const scripts = typeof this.spec.scripts === 'function' ? this.spec.scripts(this.ctx.config) : this.spec.scripts

      for (const [name, command] of Object.entries(scripts)) {
        this.merge(reporter, result, this.ctx.wiring.script(name, command))
      }

      if (result.warnings.length > 0) {
        return result
      }
    }

    const success = typeof this.spec.success === 'function' ? this.spec.success(this.ctx.config) : this.spec.success

    for (const message of success ?? []) {
      this.ctx.logger.success(message)
    }

    return result
  }

  /** Imprime el resultado y lo acumula para que `run()` decida si marca la feature. */
  private merge(reporter: Reporter, target: OperationResult, next: OperationResult): void {
    reporter.add(next)

    for (const file of next.changed) {
      if (!target.changed.includes(file)) {
        target.changed.push(file)
      }
    }

    for (const file of next.skipped) {
      if (!target.skipped.includes(file)) {
        target.skipped.push(file)
      }
    }

    for (const warning of next.warnings) {
      if (!target.warnings.includes(warning)) {
        target.warnings.push(warning)
      }
    }
  }

  private copyStage(stage: 'copyFiles' | 'post'): void {
    for (const file of this.spec.files ?? []) {
      if ((file.stage ?? 'copyFiles') === stage) {
        this.ctx.project.copy(file.to, file.from, file.policy)
      }
    }

    for (const dir of this.spec.copyDir ?? []) {
      if ((dir.stage ?? 'copyFiles') === stage) {
        this.ctx.project.copyDir(dir.to, dir.from, dir.policy)
      }
    }
  }
}

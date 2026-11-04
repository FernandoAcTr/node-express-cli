import { Context } from '../context'
import { IFileSystemGenerator, IInstallerGenerator, IPostGenerator } from '../interfaces/generator.interface'
import { Reporter } from '../report'
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
  }

  async post(): Promise<void> {
    const reporter = new Reporter(this.ctx.logger, this.spec.skippedSuffix)
    const steps = this.spec.wire ?? []
    const mainSteps = steps.filter(isMainStep)
    const otherSteps = steps.filter((step) => !isMainStep(step))

    // Primero `main.ts`: si falta un anchor, no tiene sentido escribir config,
    // env o scripts de una feature que quedaría desconectada.
    if (mainSteps.length > 0) {
      const result = this.ctx.wiring.transaction((wiring) => applyWireSteps(wiring, mainSteps, this.ctx.config))
      reporter.add(result)

      if (result.warnings.length > 0) {
        return
      }
    }

    if (otherSteps.length > 0) {
      const result = this.ctx.wiring.transaction((wiring) => applyWireSteps(wiring, otherSteps, this.ctx.config))
      reporter.add(result)

      if (result.warnings.length > 0) {
        return
      }
    }

    this.copyStage('post')

    if (this.spec.scripts) {
      const scripts = typeof this.spec.scripts === 'function' ? this.spec.scripts(this.ctx.config) : this.spec.scripts

      for (const [name, command] of Object.entries(scripts)) {
        reporter.add(this.ctx.wiring.script(name, command))
      }
    }

    const success = typeof this.spec.success === 'function' ? this.spec.success(this.ctx.config) : this.spec.success

    for (const message of success ?? []) {
      this.ctx.logger.success(message)
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

import { IFileSystemGenerator, IInstallerGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'

export class TestGenerator implements IInstallerGenerator, IFileSystemGenerator {
  constructor(private readonly ctx: Context) {}

  async installDependencies(): Promise<void> {
    if (this.ctx.has('tests')) {
      this.ctx.logger.info('The test stack is already installed; skipping dependency installation')
    } else {
      this.ctx.logger.info('================= Installing Test dependencies =================')
      await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} @faker-js/faker`, this.ctx.cwd)
      await this.ctx.shell.execAsync(
        `${this.ctx.config.getDevInstallCommand()} jest @types/jest ts-jest supertest @types/supertest`,
        this.ctx.cwd
      )
    }
    this.ctx.config.setScript('test', 'jest')
  }

  async createDirectories(): Promise<void> {
    this.ctx.project.ensureDir('src/tests')
  }

  async copyFiles(): Promise<void> {
    const policy = 'overwrite-if-unmodified' as const

    this.ctx.project.copy('jest.config.js', 'generator/common/tests/jest.config.js', policy)
    this.ctx.project.copyDir('src/tests', 'generator/common/tests/tests', policy)
  }
}

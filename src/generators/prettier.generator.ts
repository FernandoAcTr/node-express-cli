import { IFileSystemGenerator, IInstallerGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'

export class PrettierGenerator implements IFileSystemGenerator, IInstallerGenerator {
  constructor(private readonly ctx: Context) {}

  async installDependencies(): Promise<void> {
    if (this.ctx.has('prettier')) {
      this.ctx.logger.info('Prettier is already installed; skipping dependency installation')
    } else {
      this.ctx.logger.info('================= Installing Prettier =================')
      await this.ctx.shell.execAsync(`${this.ctx.config.getDevInstallCommand()} prettier`, this.ctx.cwd)
    }
    this.ctx.config.setScript('prettier:fix', 'prettier --config .prettierrc.json --write src/**/**/*.ts')
  }

  async createDirectories(): Promise<void> {
    //
  }

  async copyFiles(): Promise<void> {
    const policy = 'overwrite-if-unmodified' as const

    this.ctx.project.copy('.prettierignore', 'generator/common/prettier/.prettierignore', policy)
    this.ctx.project.copy('.prettierrc.json', 'generator/common/prettier/.prettierrc.json', policy)
  }
}

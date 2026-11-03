import path from 'path'
import { IFileSystemGenerator, IInstallerGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import fs from 'fs'

export class EslintGenerator implements IFileSystemGenerator, IInstallerGenerator {
  constructor(private readonly ctx: Context) {}

  async installDependencies(): Promise<void> {
    if (this.ctx.has('eslint')) {
      this.ctx.logger.info('ESLint is already installed; skipping dependency installation')
    } else {
      this.ctx.logger.info('================= Installing ESlint =================')
      await this.ctx.shell.execAsync(
        `${this.ctx.config.getDevInstallCommand()} eslint eslint-config-prettier eslint-plugin-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin`
      )
    }
    this.ctx.config.setScript('lint', 'eslint . --ext .ts')
    this.ctx.config.setScript('lint:fix', 'eslint . --ext .ts --fix')
  }
  async createDirectories(): Promise<void> {
    //
  }
  async copyFiles(): Promise<void> {
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/eslint/.eslintrc.js'), '.eslintrc.js')
  }
}

import path from 'path'
import { IFileSystemGenerator, IInstallerGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import fs from 'fs'

export class PrettierGenerator implements IFileSystemGenerator, IInstallerGenerator {
  constructor(private readonly ctx: Context) {}

  async installDependencies(): Promise<void> {
    this.ctx.logger.info('================= Installing Prettier =================')
    await this.ctx.shell.execAsync(`${this.ctx.config.getDevInstallCommand()} prettier`)
    this.ctx.config.setScript('prettier:fix', 'prettier --config .prettierrc.json --write src/**/**/*.ts')
  }
  async createDirectories(): Promise<void> {
    //
  }
  async copyFiles(): Promise<void> {
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/prettier/.prettierignore'), '.prettierignore')
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/prettier/.prettierrc.json'), '.prettierrc.json')
  }
}

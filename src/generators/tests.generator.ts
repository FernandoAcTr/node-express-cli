import { IFileSystemGenerator, IInstallerGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import fs from 'fs-extra'
import path from 'path'

export class TestGenerator implements IInstallerGenerator, IFileSystemGenerator {
  constructor(private readonly ctx: Context) {}

  async installDependencies(): Promise<void> {
    if (this.ctx.has('tests')) {
      this.ctx.logger.info('The test stack is already installed; skipping dependency installation')
    } else {
      this.ctx.logger.info('================= Installing Test dependencies =================')
      await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} @faker-js/faker`)
      await this.ctx.shell.execAsync(`${this.ctx.config.getDevInstallCommand()} jest @types/jest ts-jest supertest @types/supertest`)
    }
    this.ctx.config.setScript('test', 'jest')
  }

  async createDirectories(): Promise<void> {
    fs.mkdirSync('./src/tests', { recursive: true })
  }

  async copyFiles(): Promise<void> {
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/tests/jest.config.js'), './jest.config.js')
    fs.copySync(path.resolve(__dirname, '../../templates/generator/common/tests/tests'), './src/tests')
  }
}

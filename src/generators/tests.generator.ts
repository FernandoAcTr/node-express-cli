import { IFileSystemGenerator, IInstallerGenerator } from '../interfaces/generator.interface'
import { configService } from '../services/config.service'
import { shellService } from '../services/shell.service'
import fs from 'fs-extra'
import path from 'path'

export class TestGenerator implements IInstallerGenerator, IFileSystemGenerator {
  async installDependencies(): Promise<void> {
    console.log('================= Installing Test dependencies ================='.yellow)
    await shellService.execAsync(`${configService.getInstallCommand()} @faker-js/faker`)
    await shellService.execAsync(`${configService.getDevInstallCommand()} jest @types/jest ts-jest supertest @types/supertest`)
    shellService.exec('npm pkg set scripts.test="npx jest"')
  }

  async createDirectories(): Promise<void> {
    fs.mkdirSync('./src/tests', { recursive: true })
  }

  async copyFiles(): Promise<void> {
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/tests/jest.config.js'), './jest.config.js')
    fs.copySync(path.resolve(__dirname, '../../templates/generator/common/tests/tests'), './src/tests')
  }
}

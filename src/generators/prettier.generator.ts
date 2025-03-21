import path from 'path'
import { IFileSystemGenerator, IInstallerGenerator } from '../interfaces/generator.interface'
import { configService } from '../services/config.service'
import { shellService } from '../services/shell.service'
import fs from 'fs'

export class PrettierGenerator implements IFileSystemGenerator, IInstallerGenerator {
  async installDependencies(): Promise<void> {
    console.log('================= Installing Prettier ================='.yellow)
    shellService.exec(`${configService.getDevInstallCommand()} prettier`)
    shellService.exec('npm pkg set scripts.prettier:fix="prettier --config .prettierrc.json --write src/**/**/*.ts"')
  }
  async createDirectories(): Promise<void> {
    //
  }
  async copyFiles(): Promise<void> {
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/prettier/.prettierignore'), '.prettierignore')
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/prettier/.prettierrc.json'), '.prettierrc.json')
  }
}

import path from 'path'
import { IFileSystemGenerator, IInstallerGenerator } from '../interfaces/generator.interface'
import { configService } from '../services/config.service'
import { shellService } from '../services/shell.service'
import fs from 'fs'

export class EslintGenerator implements IFileSystemGenerator, IInstallerGenerator {
  async installDependencies(): Promise<void> {
    console.log('================= Installing ESlint ================='.yellow)
    await shellService.execAsync(
      `${configService.getDevInstallCommand()} eslint eslint-config-prettier eslint-plugin-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin`
    )
    configService.setScript('lint', 'eslint . --ext .ts')
    configService.setScript('lint:fix', 'eslint . --ext .ts --fix')
  }
  async createDirectories(): Promise<void> {
    //
  }
  async copyFiles(): Promise<void> {
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/eslint/.eslintrc.js'), '.eslintrc.js')
  }
}

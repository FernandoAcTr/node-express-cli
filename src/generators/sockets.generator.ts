import { confirm } from '@inquirer/prompts'
import { IFileSystemGenerator, IInstallerGenerator, IPreGenerator } from '../interfaces/generator.interface'
import { shellService } from '../services/shell.service'
import { configService } from '../services/config.service'
import fs from 'fs'
import path from 'path'

export class SocketsGenerator implements IPreGenerator, IInstallerGenerator, IFileSystemGenerator {
  async pre(): Promise<void> {
    const accepted = await confirm({
      message: 'Are you sure? This action will replace all your code in index.ts',
    })
    if (!accepted) {
      process.exit(0)
    }
  }

  async createDirectories(): Promise<void> {}

  async copyFiles(): Promise<void> {
    const config = configService.getConfig()
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/socketio/socket.ts'), './src/socket.ts')
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/socketio/socket.controller.ts'), './src/socket.controller.ts')
    if (config.fileBasedRouting) {
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/socketio/filerouting/index.ts'), './src/index.ts')
    } else {
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/socketio/index.ts'), './src/index.ts')
    }
  }

  async installDependencies(): Promise<void> {
    console.log('================= Installing Socket.io ================='.yellow)
    shellService.execAsync(`${configService.getInstallCommand()} socket.io`)
  }
}

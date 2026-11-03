import { confirm } from '@inquirer/prompts'
import { IFileSystemGenerator, IInstallerGenerator, IPreGenerator } from '../interfaces/generator.interface'
import { shellService } from '../services/shell.service'
import { configService } from '../services/config.service'
import fs from 'fs'
import path from 'path'
import { hasWebPushDependency, wirePush } from '../utils/wire_push'
import { CliError } from '../errors'

export class SocketsGenerator implements IPreGenerator, IInstallerGenerator, IFileSystemGenerator {
  async pre(): Promise<void> {
    const accepted = await confirm({
      message: 'Are you sure? This action will replace all your code in src/main.ts',
    })
    if (!accepted) {
      throw new CliError('Socket installation cancelled', {
        hint: 'Run "node-express-cli install:socket" again when you are ready.',
      })
    }
  }

  async createDirectories(): Promise<void> {}

  async copyFiles(): Promise<void> {
    const config = configService.getConfig()
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/socketio/socket.ts'), './src/socket.ts')
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/socketio/socket.controller.ts'), './src/socket.controller.ts')
    if (config.fileBasedRouting) {
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/socketio/filerouting/index.ts'), './src/main.ts')
    } else {
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/socketio/index.ts'), './src/main.ts')
    }

    // install:socket replaces main.ts, so re-apply the webpush wiring when it is already installed.
    if (hasWebPushDependency()) {
      wirePush({ main: true, config: false, env: false, script: false })
    }
  }

  async installDependencies(): Promise<void> {
    console.log('================= Installing Socket.io ================='.yellow)
    await shellService.execAsync(`${configService.getInstallCommand()} socket.io`)
  }
}

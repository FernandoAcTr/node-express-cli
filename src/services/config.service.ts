import fs from 'fs'
import { Config, DbType, PackageManager } from '../types'

export class ConfigService {
  private configFile = 'cli.config.json'

  public getConfig(): Config {
    if (!fs.existsSync(this.configFile)) {
      return { orm: DbType.TYPEORM, package_manger: PackageManager.NPM, fileBasedRouting: false }
    }

    const parsed = JSON.parse(fs.readFileSync(this.configFile).toString())

    return {
      orm: parsed.orm,
      package_manger: parsed.package_manger ?? PackageManager.NPM,
      fileBasedRouting: parsed.fileBasedRouting ?? false,
    }
  }

  public setConfigFilePath(path: string) {
    this.configFile = `./${path}/cli.config.json`
  }

  public writeConfig(config: Partial<Config>) {
    fs.writeFileSync(this.configFile, JSON.stringify(config))
  }

  public getInstallCommand() {
    const config = this.getConfig()

    const commands = {
      [PackageManager.NPM]: 'npm install',
      [PackageManager.YARN]: 'yarn',
      [PackageManager.PNPM]: 'pnpm install',
      [PackageManager.BUN]: 'bun install',
    }

    return commands[config.package_manger]
  }

  public getDevInstallCommand() {
    const config = this.getConfig()

    const commands = {
      [PackageManager.NPM]: 'npm install -D',
      [PackageManager.YARN]: 'yarn add -D',
      [PackageManager.PNPM]: 'pnpm install -D',
      [PackageManager.BUN]: 'bun install -D',
    }

    return commands[config.package_manger]
  }

  public getRunCommand() {
    const config = this.getConfig()

    const commands = {
      [PackageManager.NPM]: 'npm run',
      [PackageManager.YARN]: 'yarn',
      [PackageManager.PNPM]: 'pnpm run',
      [PackageManager.BUN]: 'bun run',
    }

    return commands[config.package_manger]
  }
}

export const configService = new ConfigService()

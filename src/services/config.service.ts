import fs from 'fs'
import { Config, DbType, PackageManager } from '../types'
import { version } from '../version'
import { CliError } from '../errors'

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
    fs.writeFileSync(this.configFile, JSON.stringify({ ...config, version }))
  }

  /**
   * Escribe un script en package.json sin depender de `npm pkg set`, para que
   * funcione igual con yarn, pnpm o bun. Devuelve true si el archivo cambió.
   */
  public setScript(name: string, command: string): boolean {
    const packageFile = 'package.json'

    if (!fs.existsSync(packageFile)) {
      throw new CliError(`Could not find ${packageFile}`, {
        hint: 'Run this command from the root of a generated project.',
      })
    }

    let packageJson: any
    try {
      packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf-8'))
    } catch {
      throw new CliError(`Could not parse ${packageFile}`, {
        hint: `Fix the JSON in ${packageFile} and try again.`,
      })
    }

    packageJson.scripts = packageJson.scripts ?? {}

    if (packageJson.scripts[name] === command) {
      return false
    }

    packageJson.scripts[name] = command
    fs.writeFileSync(packageFile, `${JSON.stringify(packageJson, null, 2)}\n`)
    return true
  }

  public getInstallCommand() {
    const config = this.getConfig()

    const commands = {
      [PackageManager.NPM]: 'npm install',
      [PackageManager.YARN]: 'yarn add',
      [PackageManager.PNPM]: 'pnpm add',
      [PackageManager.BUN]: 'bun add',
    }

    return commands[config.package_manger]
  }

  public getDevInstallCommand() {
    const config = this.getConfig()

    const commands = {
      [PackageManager.NPM]: 'npm install -D',
      [PackageManager.YARN]: 'yarn add -D',
      [PackageManager.PNPM]: 'pnpm add -D',
      [PackageManager.BUN]: 'bun add -d',
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

  public getPackageRunnerCommand() {
    const config = this.getConfig()

    const commands = {
      [PackageManager.NPM]: 'npx',
      [PackageManager.YARN]: 'yarn dlx',
      [PackageManager.PNPM]: 'pnpm dlx',
      [PackageManager.BUN]: 'bunx',
    }

    return commands[config.package_manger]
  }

  public getTypeScriptExecutionCommand() {
    const config = this.getConfig()

    const commands = {
      [PackageManager.NPM]: 'npx ts-node',
      [PackageManager.YARN]: 'yarn ts-node',
      [PackageManager.PNPM]: 'pnpm ts-node',
      [PackageManager.BUN]: 'bun',
    }

    return commands[config.package_manger]
  }
}

export const configService = new ConfigService()

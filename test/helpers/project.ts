import fs from 'fs'
import path from 'path'
import { executeCommand } from '../../src/cli'
import { Context, createContext } from '../../src/context'
import { Logger } from '../../src/logger'
import { BaseGenerator } from '../../src/generators/base.generator'
import { OrmGenerator } from '../../src/generators/orm.generator'
import { AuthGenerator } from '../../src/generators/auth.generator'
import { NotificationsGenerator } from '../../src/generators/notifications.generator'
import { SpecGenerator } from '../../src/installers'
import { mailerSpec } from '../../src/installers/specs/mailer.spec'
import { pushSpec } from '../../src/installers/specs/push.spec'
import { socketSpec } from '../../src/installers/specs/socket.spec'
import { NonInteractivePrompter } from '../../src/prompts'
import { commands } from '../../src/registry'
import { run } from '../../src/run'
import { CommandArgs, DbType, PackageManager } from '../../src/types'
import { ShellService } from '../../src/services/shell.service'

export const silentLogger: Logger = {
  info: () => undefined,
  success: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

/** Shell falso: registra los comandos y no toca la red. */
export class FakeShell {
  readonly commands: string[] = []

  async execAsync(command: string): Promise<string> {
    this.commands.push(command)
    return ''
  }

  exec(command: string) {
    this.commands.push(command)
    return { code: 0, stdout: '', stderr: '' }
  }
}

export interface ScaffoldOptions {
  /** Directorio temporal donde se creará `<root>/app`. */
  root: string
  packageManager?: PackageManager
  fileBasedRouting?: boolean
  orm?: DbType
  installOrm?: boolean
  installAuth?: boolean
  /** Instala mailer aunque auth no se instale (auth lo requiere). */
  installMailer?: boolean
  installNotifications?: boolean
  installPush?: boolean
  installSocket?: boolean
  logger?: Logger
  shell?: Pick<ShellService, 'execAsync' | 'exec'>
  installDependencies?: boolean
  /** Se ejecuta después de copiar los templates y antes de instalar dependencias. */
  onProjectCreated?: (project: string) => void
}

/**
 * Ejecuta el flujo real `init` + `install:orm` (+ `mailer`, `auth`, `socket`,
 * `push` y `notifications` según las opciones) dentro de un directorio
 * temporal. Devuelve la ruta del proyecto generado.
 *
 * Con `installDependencies: false` usa un shell falso (tests rápidos). Con
 * `installDependencies: true` ejecuta los comandos reales del package manager.
 */
export async function scaffoldProject(options: ScaffoldOptions): Promise<string> {
  const {
    root,
    packageManager = PackageManager.NPM,
    fileBasedRouting = false,
    orm = DbType.TYPEORM,
    installOrm = true,
    installAuth = true,
    installNotifications = false,
    installPush = false,
    installSocket = false,
    installMailer = installAuth || installNotifications,
    logger = silentLogger,
    installDependencies = false,
    onProjectCreated,
  } = options

  const shouldInstallAuth = installOrm && (installAuth || installNotifications)
  const shouldInstallMailer = installMailer || shouldInstallAuth

  const shell = options.shell ?? (installDependencies ? new ShellService() : new FakeShell())

  fs.mkdirSync(root, { recursive: true })

  const initCtx = createContext({
    cwd: root,
    logger,
    prompter: {
      input: async () => 'app',
      select: async <T>(prompt: { name?: string }) => {
        const values: Record<string, unknown> = {
          'package-manager': packageManager,
          'file-based-routing': fileBasedRouting,
        }
        return values[prompt.name ?? ''] as T
      },
      confirm: async () => false,
    },
    shell: shell as ShellService,
  })

  // Fases explícitas (en vez de `run`) para permitir ajustes de entorno antes
  // de instalar dependencias, p. ej. pnpm 12 exige `allowBuilds` para bcrypt.
  const base = new BaseGenerator(initCtx)
  await base.pre()
  await base.createDirectories()
  await base.copyFiles()

  const project = path.join(root, 'app')

  if (onProjectCreated) {
    onProjectCreated(project)
  }

  await base.installDependencies()
  await base.post()

  const ctx = createContext({
    cwd: project,
    logger,
    shell: shell as ShellService,
    prompter: {
      input: async () => '',
      select: async <T>(prompt: { name?: string }) => {
        const values: Record<string, unknown> = { orm }
        return values[prompt.name ?? ''] as T
      },
      confirm: async () => false,
    },
  })

  if (installOrm) {
    await run(new OrmGenerator(ctx), { ctx, feature: 'orm' })
  }

  if (shouldInstallMailer) {
    await run(new SpecGenerator(ctx, mailerSpec), { ctx, feature: 'mailer' })
  }

  if (shouldInstallAuth) {
    // `install:auth` depende de `install:mailer` para verificación y reset.
    await run(new AuthGenerator(ctx), { ctx, feature: 'auth' })
  }

  if (installSocket) {
    await run(new SpecGenerator(ctx, socketSpec), { ctx, feature: 'socket' })
  }

  if (installPush) {
    await run(new SpecGenerator(ctx, pushSpec), { ctx, feature: 'push' })
  }

  if (installNotifications && shouldInstallAuth) {
    await run(new NotificationsGenerator(ctx), { ctx, feature: 'notifications' })
  }
  return project
}

export interface InstallAllFeaturesOptions {
  shell?: Pick<ShellService, 'execAsync' | 'exec'>
  logger?: Logger
  /** Vuelve a ejecutar también las features ya marcadas, para probar idempotencia. */
  force?: boolean
}

/**
 * Instala todas las features declarativas que falten. `scaffoldProject` normalmente
 * ya instala `orm` y `auth`, así que se omiten las que `ctx.has()` reporte como
 * presentes. Con el `FakeShell` por defecto no toca la red.
 */
export async function installAllFeatures(project: string, options: InstallAllFeaturesOptions = {}): Promise<Context> {
  const args: CommandArgs = { positionals: [], flags: {} }
  const ctx = createContext({
    cwd: project,
    logger: options.logger ?? silentLogger,
    shell: (options.shell ?? new FakeShell()) as ShellService,
    prompter: new NonInteractivePrompter({ orm: DbType.TYPEORM }),
    args,
  })

  for (const command of commands) {
    if (!command.name.startsWith('install:') || !command.feature) {
      continue
    }

    if (!options.force && ctx.has(command.feature)) {
      continue
    }

    await executeCommand(command, ctx)
  }

  return ctx
}

/** Lista recursiva y ordenada de archivos, relativa a `dir`. */
export function listFiles(dir: string, base: string = dir): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  return entries
    .flatMap((entry) => {
      const absolute = path.join(dir, entry.name)
      return entry.isDirectory() ? listFiles(absolute, base) : [path.relative(base, absolute)]
    })
    .sort()
}

export function readJson<T = Record<string, unknown>>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as T
}

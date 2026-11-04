import { Context } from '../context'

/** True si el proyecto tiene un `.env` con `DB_URL` o la variable está exportada. */
export function hasDatabaseUrl(ctx: Context): boolean {
  if (process.env.DB_URL) {
    return true
  }

  if (!ctx.project.exists('.env')) {
    return false
  }

  return /^DB_URL=\S+/m.test(ctx.project.read('.env'))
}

/**
 * Ejecuta `prisma generate` cuando hay cambios en el schema y `DB_URL` está
 * disponible. Si falta `DB_URL`, avisa y deja que el usuario ejecute
 * `m:generate`; instalar la feature no debe fallar por eso.
 */
export async function generatePrismaClient(ctx: Context, shouldGenerate: boolean): Promise<void> {
  if (!shouldGenerate) {
    return
  }

  if (!hasDatabaseUrl(ctx)) {
    ctx.logger.warn('Skipped "prisma generate" because DB_URL is not set. Create .env with DB_URL and run the "m:generate" script.')
    return
  }

  await ctx.shell.execAsync(`${ctx.config.getRunCommand()} m:generate`, ctx.cwd)
}

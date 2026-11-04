# Arquitectura del CLI

Este documento explica cómo está armado `node-express-cli` y cuál es el camino
para añadir comandos sin volver a duplicar plantillas ni parches frágiles.

## Mapa de capas

| Capa          | Ubicación                               | Responsabilidad                                                                                  |
| ------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Entrada       | `src/index.ts`                          | Resuelve el comando desde el registry y ejecuta el lifecycle.                                    |
| Registro      | `src/registry.ts`                       | Única fuente de verdad: nombre, descripción, aliases, `requires`, `feature`, opciones y factory. |
| Lifecycle     | `src/run.ts`                            | Orden fijo de fases; marca la feature al terminar.                                               |
| Contexto      | `src/context.ts`                        | Inyecta `config`, `shell`, `fs`, `logger`, `prompter`, `cwd`, `has` y `markInstalled`.           |
| Generadores   | `src/generators/`                       | Implementan solo las fases que necesitan.                                                        |
| Parches       | `src/patch/` + `src/patches/`           | Modifican archivos existentes de forma idempotente.                                              |
| Plantillas    | `templates/base`, `templates/generator` | Archivos que se copian al proyecto generado.                                                     |
| Configuración | `src/services/config.service.ts`        | Lee/escribe `cli.config.json` y `package.json`; comandos por package manager.                    |

## Ciclo de vida

`src/run.ts` ejecuta, en este orden, solo las fases que el generador implementa:

```
pre -> createDirectories -> copyFiles -> installDependencies -> post -> run
                                                              |
                                              (si algo falla) rollback
```

- `pre`: prompts y validaciones previas. No debe crear archivos ni directorios.
- `createDirectories` / `copyFiles`: estructura y plantillas.
- `installDependencies`: instala paquetes; debe poder repetirse.
- `post`: parches sobre `main.ts` u otros archivos, mensajes finales.
- `run`: comandos que solo ejecutan una acción (por ejemplo `route:list`).
- `rollback` (opcional): limpia lo creado si una fase anterior lanza. `init` lo
  usa para borrar el proyecto a medias; el resto de generadores no lo necesitan.

Si el comando declara `feature` en el registry y todas las fases terminan bien,
`run()` llama a `ctx.markInstalled(feature)`. Si una fase lanza, la feature **no**
se escribe y `src/index.ts` muestra el error con `handleError`.

## Contexto

Los generadores reciben un `Context` por constructor. No existen singletons de
configuración ni de shell.

```ts
export interface Context {
  cwd: string
  config: ConfigService
  shell: ShellService
  fs: typeof fs
  logger: Logger
  prompter: Prompter
  has(feature: ContextFeature): boolean
  markInstalled(feature: Feature): void
}
```

`ctx.has('push')` consulta `features` en `cli.config.json` (con fallback legacy
para `orm` y `fileBasedRouting`). Úsalo para saltar trabajo ya hecho sin
inspeccionar `package.json`.

Los tests pueden construir el contexto con `createContext({ cwd, logger, prompter, shell })`
y sustituir solo lo necesario.

## Estado del proyecto: `cli.config.json`

```json
{
  "orm": "typeorm",
  "package_manger": "npm",
  "fileBasedRouting": false,
  "version": "3.3.0",
  "features": ["orm", "auth"]
}
```

- La clave `package_manger` está mal escrita a propósito; se mantiene por compatibilidad.
- `writeConfig()` hace **merge**: conserva claves existentes y desconocidas.
- `getConfig()` valida el JSON y normaliza valores inválidos; un archivo corrupto
  lanza `CliError` con un hint.
- `features` es la fuente de verdad de la idempotencia.

## Package manager

Nunca escribas `npm`, `npm run` ni `npx` a mano en generadores o plantillas.
Usa los helpers de `ConfigService`:

| Método                      | npm              | pnpm          | yarn          | bun          |
| --------------------------- | ---------------- | ------------- | ------------- | ------------ |
| `getInstallCommand()`       | `npm install`    | `pnpm add`    | `yarn add`    | `bun add`    |
| `getDevInstallCommand()`    | `npm install -D` | `pnpm add -D` | `yarn add -D` | `bun add -d` |
| `getRunCommand()`           | `npm run`        | `pnpm run`    | `yarn`        | `bun run`    |
| `getPackageRunnerCommand()` | `npx`            | `pnpm dlx`    | `yarn dlx`    | `bunx`       |

Para scripts de `package.json` usa `setScript(name, command)` o
`setScripts({ ... })`; nunca `npm pkg set`. Los scripts base viven en
`src/utils/scripts.ts` (`baseScripts`, `ormScripts`).

## Plantillas

- `templates/base/`: se copia entera al proyecto en `init`.
- `templates/generator/`: archivos que copian los comandos `install:*` y `make:*`.
- Los `.ts` de `templates/` **no se compilan** en este repo (`tsconfig.json` los
  excluye). Los valida el smoke test generando un proyecto y corriendo `tsc`.

Placeholders disponibles (se sustituyen por string replace y deben conservarse):

```
__ServiceName__  __servicefile__  __modulename__
__ClassName__    __EntityName__   __PRISMA_SEED_COMMAND__
```

## Parches idempotentes y anchors

`templates/base/src/main.ts` es **el único** `main.ts`. Contiene marcas estables:

```
// @nec:imports
// @nec:before-app
// @nec:before-json
// @nec:before-listen
// @nec:after-listen
```

Los instaladores insertan código con `patchAtAnchor(file, anchor, snippet, options)`:

```ts
patchAtAnchor(mainFile, 'imports', "import passport from 'passport'", { sort: true })
patchAtAnchor(mainFile, 'beforeApp', "passport.use('jwt', JWTStrategy)", {
  dedupeKey: "passport.use('jwt'",
})
```

- `dedupeKey` evita duplicados (por defecto se usa el snippet).
- `sort: true` ordena el bloque contiguo de imports.
- En proyectos viejos sin anchors devuelve `anchor-missing`; los generadores
  avisan con `Reporter` y **no** fallan.

Nunca reemplaces `main.ts` completo desde un comando nuevo.

## Reporter

`src/report.ts` define `OperationResult` (`changed`, `skipped`, `warnings`) y
`Reporter` para imprimir resultados de forma uniforme:

```ts
const reporter = new Reporter(this.ctx.logger)
reporter.patches(mainFile, patches)
reporter.add(operationResult)
```

Los warnings se deduplican para no repetir el mismo mensaje por cada anchor.

## Cómo añadir un comando

Ejemplo: `install:cache`.

1. Crea `src/generators/cache.generator.ts`:

```ts
import { IFileSystemGenerator, IInstallerGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'

export class CacheGenerator implements IFileSystemGenerator, IInstallerGenerator {
  constructor(private readonly ctx: Context) {}

  async createDirectories(): Promise<void> {
    this.ctx.fs.mkdirSync(`${this.ctx.cwd}/src/cache`, { recursive: true })
  }

  async copyFiles(): Promise<void> {
    // copia templates/generator/cache/*
  }

  async installDependencies(): Promise<void> {
    if (this.ctx.has('cache')) {
      this.ctx.logger.info('Cache is already installed; skipping dependency installation')
      return
    }

    this.ctx.logger.info('================= Installing cache =================')
    await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} lru-cache`)
    this.ctx.config.setScript('cache:clear', 'node build/cache/clear.js')
  }
}
```

2. Regístralo **una sola vez** en `src/registry.ts`:

```ts
{
  name: 'install:cache',
  description: 'Add an in-memory cache layer',
  feature: 'cache',
  create: (ctx) => new CacheGenerator(ctx),
}
```

3. Añade `'cache'` al tipo `Feature` en `src/types/index.ts`.

4. Escribe tests:
   - unitario del generador con `FakeShell` y un `cwd` temporal;
   - si toca `main.ts`, un golden test (ver abajo).

5. Actualiza `README.md` y este documento si cambia el contrato.

Reglas:

- No importes `configService`/`shellService`: no existen.
- El lifecycle debe poder ejecutarse dos veces sin duplicar archivos, imports ni scripts.
- Los prompts deben llevar `name` para funcionar con `--no-interaction`.

## Tests

```bash
npm test          # unit + golden, rápido y sin red
npm run test:smoke # genera, instala y compila un proyecto real (lento)
```

| Tipo        | Ubicación                                                   | Qué cubre                                                                                |
| ----------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Unit        | `test/utils`, `test/services`, `test/patch`, `test/patches` | helpers, configuración, anchors, scripts, webpush                                        |
| Generadores | `test/generators`, `test/commands`                          | routing, módulos, sockets, `route:list`                                                  |
| Golden      | `test/golden`                                               | `init` + `install:orm` + `install:auth`: árbol de archivos, `main.ts`, `cli.config.json` |
| Smoke       | `test/smoke`                                                | proyecto real + `tsc --noEmit`; solo con `NEC_SMOKE=1`                                   |

Los snapshots están en `test/golden/__snapshots__/`. Si el cambio es
intencional, actualízalos con `npm test -- -u` y revísalos en el diff.

El smoke test usa `SMOKE_PACKAGE_MANAGER` (`npm`/`pnpm`) y `SMOKE_FILE_BASED`
(`true`/`false`). `.github/workflows/ci.yml` corre la matriz completa.

## CI

- Job `test`: `npm ci`, `npm run build`, `npm test`.
- Job `smoke`: matriz `{npm, pnpm} × {fileBasedRouting true,false}`; instala un
  proyecto generado con TypeORM y corre `tsc --noEmit`.

Cualquier cambio que rompa un template debe fallar en CI, no en la máquina del
usuario.

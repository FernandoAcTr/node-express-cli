# Arquitectura del CLI

Este documento explica cómo está armado `node-express-cli` y cuál es el camino
para añadir comandos sin volver a duplicar plantillas ni parches frágiles.

## Mapa de capas

| Capa          | Ubicación                               | Responsabilidad                                                                                  |
| ------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Entrada       | `src/index.ts`                          | Resuelve el comando desde el registry y ejecuta el lifecycle.                                    |
| Registro      | `src/registry.ts`                       | Única fuente de verdad: nombre, descripción, aliases, `requires`, `requiresProject`, `feature`, opciones y factory. |
| Lifecycle     | `src/run.ts`                            | Orden fijo de fases; marca la feature al terminar.                                               |
| Contexto      | `src/context.ts`                        | Inyecta `config`, `project`, `wiring`, `shell`, `fs`, `logger`, `prompter`, `cwd`, `force`, `has` y `markInstalled`. |
| Escritura     | `src/services/project.service.ts`       | Política de propiedad, manifest y rutas absolutas dentro del proyecto.                           |
| Generadores   | `src/generators/`                       | Implementan solo las fases que necesitan.                                                        |
| Wiring        | `src/wiring/`                           | Modifica archivos existentes (`main.ts`, config, env, scripts) sin parches ad-hoc.               |
| Parches       | `src/patch/`                            | Motor de markers: inserción atómica, dedupe y bloques.                                           |
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
  project: ProjectService
  wiring: WiringService
  shell: ShellService
  fs: typeof fs
  logger: Logger
  prompter: Prompter
  force: boolean
  has(feature: ContextFeature): boolean
  markInstalled(feature: Feature): void
}
```

`ctx.has('push')` consulta `features` en `cli.config.json` (con fallback legacy
para `orm` y `fileBasedRouting`). Úsalo para saltar trabajo ya hecho sin
inspeccionar `package.json`.

Los tests pueden construir el contexto con `createContext({ cwd, logger, prompter, shell, force })`
y sustituir solo lo necesario. `ctx.cwd` es la raíz del proyecto; ningún
generador debe usar rutas relativas a `process.cwd()`.

`ctx.wiring` es el único punto que modifica archivos existentes. Los generadores
no conocen los markers `@nec:` ni llaman a `patchAtAnchor` directamente.

## Escritura de archivos y `--force`

Todo archivo generado se escribe con `ctx.project`:

```ts
this.ctx.project.ensureDir('src/utils')
this.ctx.project.copy('src/utils/mailer.ts', 'generator/common/mailer/mailer.ts')
this.ctx.project.write('src/config/cache.ts', code, 'create')
```

`ProjectService` mantiene `.nec/manifest.json` con el hash SHA-256 de cada
archivo que creó el CLI:

```json
{
  "version": 1,
  "generated": {
    "src/utils/mailer.ts": "sha256:..."
  }
}
```

Políticas disponibles:

| Política                 | Cuándo usarla                | Comportamiento                                                        |
| ------------------------ | ---------------------------- | --------------------------------------------------------------------- |
| `create`                 | `make:*`                     | Falla si el archivo existe; `--force` lo sobrescribe.                 |
| `skip`                   | merges imposibles (Prisma)   | No toca el archivo si existe.                                         |
| `overwrite`              | reemplazo explícito          | Solo sobrescribe con `--force`.                                       |
| `overwrite-if-unmodified`| `install:*`                  | Sobrescribe solo si el hash coincide con el manifest.                 |

Si el archivo existe y el usuario lo modificó, se omite con un warning que
menciona `--force`. Si no está en el manifest, también se omite: el CLI no
sobrescribe archivos que no creó. Si el contenido existente es idéntico al que
el CLI generaría, se adopta en el manifest sin warning (compatibilidad con
proyectos anteriores a `.nec/manifest.json`). Los archivos binarios se copian
como `Buffer`, sin pasar por UTF-8.

Un comando con `requiresProject !== false` (todos menos `init`) exige
`cli.config.json` y `package.json` en `ctx.cwd`. Si faltan, `src/index.ts` falla
antes de crear nada.

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

## Wiring idempotente y anchors

`templates/base/src/main.ts` es **el único** `main.ts`. Contiene marcas estables:

```
// @nec:imports
// @nec:before-app
// @nec:before-json
// @nec:before-listen
// @nec:after-listen
```

`templates/base/src/config/index.ts` y `.env.example` tienen sus propios anchors
(`// @nec:config` y `# @nec:env`).

Los instaladores no tocan archivos existentes directamente. Usan
`ctx.wiring` y un `Reporter`:

```ts
const reporter = new Reporter(this.ctx.logger)
const result = this.ctx.wiring.transaction((wiring) => {
  wiring.import("import passport from 'passport'")
  wiring.main('beforeApp', "passport.use('jwt', JWTStrategy)", { key: "passport.use('jwt'" })
})

reporter.add(result)
```

API de `WiringService`:

| Método                          | Archivo                | Uso                                      |
| ------------------------------- | ---------------------- | ---------------------------------------- |
| `import(statement, opts)`       | `src/main.ts`          | Añade al bloque `@nec:imports`.          |
| `main(anchor, code, opts)`      | `src/main.ts`          | Añade runtime junto a un anchor.         |
| `config(code, opts)`            | `src/config/index.ts`  | Añade una entrada a `config`.            |
| `env(code, opts)`               | `.env.example`         | Añade variables al final del anchor.     |
| `envBlock(marker, code, opts)`  | `.env.example`         | Bloque reemplazable (`@nec:…:start/end`).|
| `script(name, command)`         | `package.json`         | Escribe un script sin duplicarlo.        |
| `block(file, marker, code, opts)`| cualquiera            | Bloque delimitado y reemplazable.        |

Detalles del motor (`src/patch/`):

- `patchAtMarker(file, marker, snippet, options)` acepta un marker literal o un
  nombre de anchor; `patchAtAnchor` sigue existiendo como atajo.
- Los parches de un mismo archivo se aplican en **una sola escritura**. Si falta
  cualquier marker del grupo, no se escribe nada (`anchor-missing`) y el
  generador recibe un warning: nunca queda runtime sin import.
- Los imports se deduplican por módulo, aceptando comillas simples/dobles y
  espacios distintos. `sort: true` solo ordena bloques de imports de una línea;
  si hay imports multilínea o comentarios, el bloque se deja intacto.
- `patchBlock` mantiene bloques `@nec:<marker>:start` / `@nec:<marker>:end`.
- El filesystem del motor es inyectable (`PatchFileSystem`) para tests.
- La feature se escribe en `cli.config.json` solo si el lifecycle termina bien;
  un wiring con warnings no lanza, pero deja constancia en consola.

Nunca reemplaces `main.ts` completo desde un comando nuevo.

## Reporter

`src/report.ts` define `OperationResult` (`changed`, `skipped`, `warnings`) y
`Reporter` para imprimir resultados de forma uniforme:

```ts
const reporter = new Reporter(this.ctx.logger)
reporter.add(this.ctx.wiring.transaction((wiring) => wiring.import('...')))
```

Los warnings del reporter se deduplican para no repetir el mismo mensaje.

## Cómo añadir un comando

Ejemplo: `install:cache`.

1. Crea `src/generators/cache.generator.ts`:

```ts
import { IFileSystemGenerator, IInstallerGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'

export class CacheGenerator implements IFileSystemGenerator, IInstallerGenerator {
  constructor(private readonly ctx: Context) {}

  async createDirectories(): Promise<void> {
    this.ctx.project.ensureDir('src/cache')
  }

  async copyFiles(): Promise<void> {
    this.ctx.project.copy('src/cache/store.ts', 'generator/cache/store.ts')
  }

  async installDependencies(): Promise<void> {
    if (this.ctx.has('cache')) {
      this.ctx.logger.info('Cache is already installed; skipping dependency installation')
      return
    }

    this.ctx.logger.info('================= Installing cache =================')
    await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} lru-cache`, this.ctx.cwd)
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

Todos los comandos nuevos exigen un proyecto generado salvo que declares
`requiresProject: false` (solo lo hace `init`).

3. Añade `'cache'` al tipo `Feature` en `src/types/index.ts`.

4. Escribe tests:
   - unitario del generador con `FakeShell` y un `cwd` temporal;
   - si toca `main.ts`, un golden test (ver abajo).

5. Actualiza `README.md` y este documento si cambia el contrato.

Reglas:

- No importes `configService`/`shellService`: no existen.
- Escribe siempre con `ctx.project` y sus políticas; no uses `fs.writeFileSync` para archivos del proyecto.
- Modifica archivos existentes solo con `ctx.wiring`; no uses `@nec:` ni `patchAtAnchor` en generadores.
- Usa `ctx.cwd` (o pasa `ctx.cwd` a `execAsync`) en vez de rutas relativas a `process.cwd()`.
- El lifecycle debe poder ejecutarse dos veces sin duplicar archivos, imports ni scripts.
- Los prompts deben llevar `name` para funcionar con `--no-interaction`.

## Tests

```bash
npm test          # unit + golden, rápido y sin red
npm run test:smoke # genera, instala y compila un proyecto real (lento)
```

| Tipo        | Ubicación                                                   | Qué cubre                                                                                |
| ----------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Unit        | `test/utils`, `test/services`, `test/patch`, `test/wiring`  | helpers, configuración, `ProjectService`/manifest, markers, bloques, `WiringService`        |
| Generadores | `test/generators`, `test/commands`                          | routing, módulos, auth, mailer, push, migraciones, sockets, `route:list`                     |
| Golden      | `test/golden`                                               | `init` + `install:orm` + `install:auth`: árbol de archivos, `main.ts`, `cli.config.json`      |
| Smoke       | `test/smoke`                                                | proyecto real + `tsc --noEmit`; solo con `NEC_SMOKE=1`                                      |

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

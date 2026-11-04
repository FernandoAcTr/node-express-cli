# Arquitectura del CLI

Este documento explica cómo está armado `node-express-cli` y cuál es el camino
para añadir comandos sin volver a duplicar plantillas ni parches frágiles.

## Mapa de capas

| Capa          | Ubicación                               | Responsabilidad                                                                                                                        |
| ------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Entrada       | `src/index.ts` + `src/cli.ts`           | `index` parsea; `cli` resuelve el comando, valida `requiresProject`/`requires` y ejecuta el lifecycle.                                 |
| Registro      | `src/registry.ts`                       | Única fuente de verdad: nombre, descripción, aliases, `requires`, `requiresProject`, `feature`, opciones y factory.                    |
| Lifecycle     | `src/run.ts`                            | Orden fijo de fases; marca la feature y su metadata al terminar.                                                                       |
| Contexto      | `src/context.ts`                        | Inyecta `config`, `project`, `wiring`, `shell`, `fs`, `logger`, `prompter`, `cwd`, `args`, `force`, `dryRun`, `has` y `markInstalled`. |
| Escritura     | `src/services/project.service.ts`       | Política de propiedad, manifest y rutas absolutas dentro del proyecto.                                                                 |
| Generadores   | `src/generators/`                       | Implementan solo las fases que necesitan.                                                                                              |
| Instaladores  | `src/installers/`                       | `InstallerSpec` declarativo, `SpecGenerator` y specs de features simples.                                                              |
| Wiring        | `src/wiring/`                           | Modifica archivos existentes (`main.ts`, config, env, scripts) sin parches ad-hoc.                                                     |
| Parches       | `src/patch/`                            | Motor de markers: inserción atómica, dedupe y bloques.                                                                                 |
| Plantillas    | `templates/base`, `templates/generator` | Archivos que se copian al proyecto generado.                                                                                           |
| Configuración | `src/services/config.service.ts`        | Lee/escribe `cli.config.json` y `package.json`; comandos por package manager.                                                          |

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
- `installMetadata` (opcional): devuelve el estado que `run()` debe persistir
  junto con la feature. `install:orm` lo usa para guardar `{ orm }` al final.

Si el comando declara `feature` en el registry y todas las fases terminan bien,
`run()` llama a `ctx.markInstalled(feature, metadata)`. La feature y su metadata
se escriben en una sola operación atómica sobre `cli.config.json`. Si una fase
lanza, no se escribe nada y `src/index.ts` muestra el error con `handleError`.
Por eso `install:orm` ya no escribe `config.orm` en `pre()`: un fallo de
instalación deja el proyecto sin ORM persistido.

## Comandos, flags y `--help`

`src/index.ts` solo parsea y arranca. La resolución vive en `src/cli.ts`:

- `resolveCommandName` acepta el comando como posicional (`nec make:module`) o
  como flag (`nec --init`, `nec -i`).
- `findCommand` resuelve aliases desde el registry.
- `assertCommandCanRun` valida `requiresProject` y `requires` **antes** de que
  el generador cree nada.
- `executeCommand` ejecuta el lifecycle común.

`CommandDefinition.requiresProject` es obligatorio: cada comando declara si
necesita un proyecto generado. Solo `init` usa `false`. `requires` son objetos
`{ feature, hint }`, de modo que añadir un requisito no obliga a tocar el
entrypoint.

Las opciones globales son solo `--no-interaction`, `--ci`, `--force` y
`--dry-run`. Las opciones propias (`--name`, `--omit`, `--orm`, etc.) se
registran con `yargs.command()` y solo aparecen en el help de su comando. El
snapshot vive en `test/cli/__snapshots__/help.test.ts.snap`.

Los flags ya parseados están en `ctx.args` (`positionals` y `flags`).
`ctx.force` y `ctx.dryRun` son atajos derivados de `ctx.args`; usa
`ctx.args.flags` para flags nuevos de un comando.

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
  fs: FileSystem
  logger: Logger
  prompter: Prompter
  args: CommandArgs
  force: boolean
  dryRun: boolean
  has(feature: ContextFeature): boolean
  markInstalled(feature: Feature, metadata?: FeatureMetadata): void
}
```

`ctx.has('push')` consulta `features` en `cli.config.json` como fuente de
verdad. Para proyectos anteriores a `features`, `has('orm')` cae al valor de
`config.orm` y avisa una sola vez por contexto para que el usuario pueda
regularizar el estado con `install:orm`; `fileBasedRouting` se lee directamente
de la configuración. Úsalo para saltar trabajo ya hecho sin inspeccionar
`package.json`.

`markInstalled(feature, metadata?)` escribe la feature y su metadata en una sola
operación. El único metadata actual es `{ orm }`, que se registra al terminar
`install:orm`.

Los tests pueden construir el contexto con `createContext({ cwd, logger, prompter, shell, args, force })`
y sustituir solo lo necesario. `ctx.cwd` es la raíz del proyecto; ningún
generador debe usar rutas relativas a `process.cwd()`.

`ctx.wiring` es el único punto que modifica archivos existentes. Los generadores
no conocen los markers `@nec:` ni llaman a `patchAtAnchor` directamente.

## Escritura de archivos, `--force` y `--dry-run`

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

| Política                  | Cuándo usarla              | Comportamiento                                        |
| ------------------------- | -------------------------- | ----------------------------------------------------- |
| `create`                  | `make:*`                   | Falla si el archivo existe; `--force` lo sobrescribe. |
| `skip`                    | merges imposibles (Prisma) | No toca el archivo si existe.                         |
| `overwrite`               | reemplazo explícito        | Solo sobrescribe con `--force`.                       |
| `overwrite-if-unmodified` | `install:*`                | Sobrescribe solo si el hash coincide con el manifest. |

Si el archivo existe y el usuario lo modificó, se omite con un warning que
menciona `--force`. Si no está en el manifest, también se omite: el CLI no
sobrescribe archivos que no creó. Si el contenido existente es idéntico al que
el CLI generaría, se adopta en el manifest sin warning (compatibilidad con
proyectos anteriores a `.nec/manifest.json`). Los archivos binarios se copian
como `Buffer`, sin pasar por UTF-8.

Un comando con `requiresProject` (todos menos `init`) exige `cli.config.json` y
`package.json` en `ctx.cwd`. Si faltan, `src/cli.ts` falla antes de crear nada;
por eso `nec make:module` fuera de un proyecto no crea `./src`.

Con `--dry-run`, `createContext` inyecta un `VirtualFileSystem`: las lecturas
van al disco real y las escrituras (incluido `.nec/manifest.json`) quedan en
memoria. `ConfigService`, `ProjectService` y `WiringService` comparten ese FS,
y `ShellService` solo imprime `[dry-run] would run: …`. Así el lifecycle
completo se valida sin tocar el proyecto.

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
- `features` es la fuente de verdad de la idempotencia. Las features válidas se
  declaran en `FEATURES` (`src/types/index.ts`); `Feature` se deriva de esa lista.
- `features` y `orm` se escriben juntos al final de `install:orm` mediante
  `ctx.markInstalled('orm', { orm })`; un fallo no deja el ORM persistido.
- Los proyectos viejos sin `features` siguen funcionando: `has('orm')` usa
  `config.orm` como fallback y emite un warning por contexto.

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
`src/utils/scripts.ts` (`baseScripts`, `ormScripts`). Los scripts de una feature
opcional se declaran en su `InstallerSpec` (`scripts`), no en `baseScripts`.

## Instaladores declarativos

Un `install:*` simple no necesita un generador propio. Se define con un
`InstallerSpec` y se registra con `installer(spec)`:

```ts
// src/installers/specs/mailer.spec.ts
export const mailerSpec: InstallerSpec = {
  feature: 'mailer',
  description: 'Add support for send mails via nodemailer library',
  deps: ['handlebars', 'nodemailer'],
  devDeps: ['@types/nodemailer'],
  files: [{ from: 'generator/common/mailer/mailer.ts', to: 'src/utils/mailer.ts' }],
  copyDir: [{ from: 'generator/common/mailer/templates', to: 'src/templates' }],
  wire: [
    { kind: 'config', code: MAILER_CONFIG, key: 'MAILER:' },
    { kind: 'envBlock', marker: 'mailer', code: MAILER_ENV, key: 'MAIL_HOST=' },
  ],
}

// src/registry.ts
installer(mailerSpec),
```

`SpecGenerator` ejecuta el lifecycle genérico:

- `deps`/`devDeps` usan los comandos del package manager del proyecto.
- `dirs` se crean en `createDirectories`.
- `files`/`copyDir` se copian en `copyFiles`; con `stage: 'post'` se copian solo
  después de que el wiring de `main.ts` termine sin warnings (así socket no
  deja archivos desconectados).
- `wire` se aplica en `post`: primero los pasos de `main.ts` de forma atómica y,
  si no hay warnings, el resto (config, env, bloques).
- `scripts` se escriben con `WiringService.script` después del wiring.
- `success` imprime el cierre de la feature.

Los instaladores con lógica propia siguen siendo custom: `orm` (elige el ORM,
copia templates por motor y calcula scripts), `auth` (templates por ORM) y
`migration` (shell). `orm` reutiliza `ormWireSteps()` para la configuración
`DB` y las variables `DB_*`, que ya no viven en `templates/base`.

`templates/base` solo contiene lo común a todos los proyectos. `MAILER`,
`MAIL_*`, `VAPID`, `DB_*`, `prettier:fix` y `vapid:generate` pertenecen a los
specs de sus features.

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

| Método                            | Archivo               | Uso                                       |
| --------------------------------- | --------------------- | ----------------------------------------- |
| `import(statement, opts)`         | `src/main.ts`         | Añade al bloque `@nec:imports`.           |
| `main(anchor, code, opts)`        | `src/main.ts`         | Añade runtime junto a un anchor.          |
| `config(code, opts)`              | `src/config/index.ts` | Añade una entrada a `config`.             |
| `env(code, opts)`                 | `.env.example`        | Añade variables al final del anchor.      |
| `envBlock(marker, code, opts)`    | `.env.example`        | Bloque reemplazable (`@nec:…:start/end`). |
| `script(name, command)`           | `package.json`        | Escribe un script sin duplicarlo.         |
| `block(file, marker, code, opts)` | cualquiera            | Bloque delimitado y reemplazable.         |

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

### `install:*` simple (spec)

Ejemplo: `install:cache`.

1. Crea `src/installers/specs/cache.spec.ts`:

```ts
import { InstallerSpec } from '../spec'

export const cacheSpec: InstallerSpec = {
  feature: 'cache',
  description: 'Add an in-memory cache layer',
  deps: ['lru-cache'],
  dirs: ['src/cache'],
  files: [{ from: 'generator/cache/store.ts', to: 'src/cache/store.ts' }],
  scripts: { 'cache:clear': 'node build/cache/clear.js' },
  success: ['Cache support is ready'],
}
```

2. Añade una línea en `src/registry.ts`:

```ts
installer(cacheSpec),
```

3. Añade `'cache'` a `FEATURES` en `src/types/index.ts`. El tipo `Feature` se
   deriva automáticamente y `installer()` crea el comando `install:cache`.

El instalador en sí son dos archivos: el spec y la línea del registry. `FEATURES`
solo declara el nombre de la feature para que el tipo y `cli.config.json` la
conozcan.

### Comando custom

Si necesita prompts, elegir entre varios ORMs o ejecutar shell propio, crea un
generador en `src/generators/` y regístralo con `create: (ctx) => new XGenerator(ctx)`.
Sigue el lifecycle de `src/run.ts` y usa `ctx.project`/`ctx.wiring` como el resto.
Ejemplos actuales: `auth`, `orm`, `migration`, `make:*`.

Todos los comandos declaran `requiresProject`; solo `init` usa `false`. Si un
comando necesita una feature instalada, declara
`requires: [{ feature: 'orm', hint: 'Run "node-express-cli install:orm" first.' }]`.
El hint se muestra tal cual en `src/cli.ts`; no añadas switches de requisitos
en el entrypoint.

Declara los flags propios en `options` del registry. Llegan en `ctx.args.flags`
y solo aparecen en el help de ese comando. Usa `booleanFlag`/`stringFlag` de
`src/utils/args.ts` para leerlos con tipos.

4. Escribe tests:
   - unitario del spec/generador con `FakeShell` y un `cwd` temporal;
   - si toca `main.ts`, un golden test (ver abajo).

5. Actualiza `README.md` y este documento si cambia el contrato.

Reglas:

- No importes `configService`/`shellService`: no existen.
- Escribe siempre con `ctx.project` y sus políticas; no uses `fs.writeFileSync` para archivos del proyecto.
- Modifica archivos existentes solo con `ctx.wiring`; no uses `@nec:` ni `patchAtAnchor` en generadores.
- Los specs declaran `wire`/`scripts`; no meten `@nec:` ni llaman a `patchAtAnchor`.
- Usa `ctx.cwd` (o pasa `ctx.cwd` a `execAsync`) en vez de rutas relativas a `process.cwd()`.
- El lifecycle debe poder ejecutarse dos veces sin duplicar archivos, imports ni scripts.
- Los prompts deben llevar `name` para funcionar con `--no-interaction`.

## Tests

```bash
npm test          # unit + golden, rápido y sin red
npm run test:smoke # genera, instala y compila un proyecto real (lento)
```

| Tipo         | Ubicación                                                  | Qué cubre                                                                                |
| ------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Unit         | `test/utils`, `test/services`, `test/patch`, `test/wiring` | helpers, configuración, `ProjectService`/manifest, markers, bloques, `WiringService`     |
| CLI          | `test/cli`                                                 | dispatch, `requiresProject`/`requires`, `ctx.args`, `--dry-run` y snapshot de `--help`   |
| Instaladores | `test/installers`                                          | specs, `SpecGenerator`, base sin features opcionales, `installer(spec)`                  |
| Contratos    | `test/contracts`                                           | todos los `install:*`: idempotencia, líneas custom, placeholders, estado y scripts       |
| Generadores  | `test/generators`, `test/commands`                         | routing, módulos, auth, mailer, push, migraciones, sockets, `route:list`                 |
| Golden       | `test/golden`                                              | `init` + `install:orm` + `install:auth`: árbol de archivos, `main.ts`, `cli.config.json` |
| Smoke        | `test/smoke`                                               | proyecto real + `tsc --noEmit`; solo con `NEC_SMOKE=1`                                   |

Los snapshots están en `test/golden/__snapshots__/` y `test/cli/__snapshots__/`. Si el cambio es
intencional, actualízalos con `npm test -- -u` y revísalos en el diff.

El smoke test usa `SMOKE_PACKAGE_MANAGER` (`npm`/`pnpm`) y `SMOKE_FILE_BASED`
(`true`/`false`). `.github/workflows/ci.yml` corre la matriz completa.

## CI

- Job `test`: `npm ci`, `npm run build`, `npm test`.
- Job `smoke`: matriz `{npm, pnpm} × {fileBasedRouting true,false}`; instala un
  proyecto generado con TypeORM y corre `tsc --noEmit`.

Cualquier cambio que rompa un template debe fallar en CI, no en la máquina del
usuario.

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
- `post`: parches sobre `main.ts` u otros archivos, mensajes finales. Puede
  devolver un `OperationResult`; si contiene warnings, el wiring quedó
  incompleto.
- `run`: comandos que solo ejecutan una acción (por ejemplo `route:list`).
- `rollback` (opcional): limpia lo creado si una fase anterior lanza. `init` lo
  usa para borrar el proyecto a medias; el resto de generadores no lo necesitan.
- `installMetadata` (opcional): devuelve el estado que `run()` debe persistir
  junto con la feature. `install:orm` lo usa para guardar `{ orm }` al final.

Si el comando declara `feature` en el registry, todas las fases terminan bien y
`post` no devolvió warnings de wiring, `run()` llama a
`ctx.markInstalled(feature, metadata)`. La feature y su metadata se escriben en
una sola operación atómica sobre `cli.config.json`. Si una fase lanza, no se
escribe nada y `src/index.ts` muestra el error con `handleError`.

Si `post` devuelve un `OperationResult` con warnings (por ejemplo, falta un
anchor), `run()` **no** marca la feature: el proyecto quedaría con
`features` diciendo que está instalada aunque `main.ts`, config o `.env.example`
no estén conectados. El comando termina con un mensaje que pide corregir el
wiring y reintentar. Por eso `install:orm` ya no escribe `config.orm` en
`pre()`: un fallo de instalación deja el proyecto sin ORM persistido.

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
`--dry-run`. Las opciones propias (`--name`, `--omit`, `--prefix`, `--orm`,
etc.) se registran con `yargs.command()` y solo aparecen en el help de su
comando. El snapshot vive en `test/cli/__snapshots__/help.test.ts.snap`.

`route:list` usa `--prefix` para el prefijo de los módulos (por defecto `/api`)
y `--omit` para quitar ese prefijo de la salida:

```bash
node-express-cli route:list --prefix /v1
node-express-cli route:list --prefix /v1 --omit /v1
```

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
| `skip`                    | no tocar archivos existentes | No toca el archivo si existe.                        |
| `overwrite`               | reemplazo explícito        | Solo sobrescribe con `--force`.                       |
| `overwrite-if-unmodified` | `install:*`                | Sobrescribe solo si el hash coincide con el manifest. |

Si el archivo existe y el usuario lo modificó, se omite con un warning que
menciona `--force`. Si no está en el manifest, también se omite: el CLI no
sobrescribe archivos que no creó. Si el contenido existente es idéntico al que
el CLI generaría, se adopta en el manifest sin warning (compatibilidad con
proyectos anteriores a `.nec/manifest.json`). Los archivos binarios se copian
como `Buffer`, sin pasar por UTF-8.

Los comandos que escriben varios archivos con política `create` llaman antes a
`project.assertCanCreate(paths)`. El preflight comprueba todos los destinos y
falla con la lista de archivos existentes antes de escribir el primero; con
`--force` no bloquea. `make:module` lo usa para no dejar un módulo a medias.

Toda escritura de `cli.config.json` o `package.json` debe registrar el archivo
con `project.record(...)`. `Context.markInstalled` lo hace para
`cli.config.json`; `install:orm`, `install:*` con dependencias y `auth` lo hacen
para `package.json` después de que el package manager lo modifique o de que
`ConfigService.setScripts` lo reescriba. Así el manifest describe el archivo
final y no parece modificado por el usuario en la siguiente ejecución.

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
- Una feature solo se escribe si el lifecycle terminó sin errores y `post` no
  devolvió warnings de wiring. Así `ctx.has(feature)` nunca dice `true` para una
  feature desconectada.
- `features` y `orm` se escriben juntos al final de `install:orm` mediante
  `ctx.markInstalled('orm', { orm })`; un fallo no deja el ORM persistido.
- `markInstalled` registra `cli.config.json` en `.nec/manifest.json` después de
  `markFeature`. Sin ese registro, el hash quedaría viejo y el archivo parecería
  editado por el usuario.
- Cambiar el ORM de un proyecto existente está bloqueado en `OrmGenerator.pre()`:
  la limpieza automática necesita un manifest con propietario por feature. Para
  usar otro motor hay que crear un proyecto nuevo o borrar los archivos y la
  feature `orm` a mano.
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

`install:eslint` declara `requires: [{ feature: 'prettier' }]` y copia
`eslint.config.mjs` (flat config) con `typescript-eslint`,
`@eslint/js` y `eslint-config-prettier`. Los scripts `lint`/`lint:fix` apuntan a
`src/**/*.ts`; Prettier sigue siendo un comando aparte (`prettier:fix`), por eso
el config solo desactiva reglas que chocan con el formato. El smoke de todas las
features ejecuta `eslint src` además de `tsc --noEmit`.

Los instaladores con lógica propia siguen siendo custom: `orm` (elige el ORM,
copia templates por motor y calcula scripts), `auth` (dominio compartido +
repositorio por ORM) y `migration` (shell). `orm` reutiliza `ormWireSteps()` para
la configuración `DB` y las variables `DB_*`, que ya no viven en
`templates/base`. Cambiar de ORM en un proyecto existente se rechaza en `pre()`
antes de copiar archivos: no hay limpieza automática y el proyecto quedaría
mezclado.

`install:auth` declara `requires: [{ feature: 'orm' }, { feature: 'mailer' }]`.
El dominio (`auth.service.ts`, `auth.controller.ts`, `auth.tokens.ts`,
`auth.validator.ts`, `auth.mailer.ts`, `passport.ts`) es común; solo
`auth.repository.ts` cambia por ORM y traduce las entidades al contrato
`auth.types.ts`. Añadir un motor nuevo requiere sus entidades y un repositorio,
no tocar el servicio.

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

`templates/base/src/main.ts` es **el único** `main.ts`. Los archivos existentes
solo se modifican en los puntos marcados:

| Archivo                                         | Anchor                      | Nombre en `WiringService` | Lo usan                                     |
| ----------------------------------------------- | --------------------------- | ------------------------- | ------------------------------------------- |
| `templates/base/src/main.ts`                    | `// @nec:imports`           | `import()`                | todas las features con imports              |
| `templates/base/src/main.ts`                    | `// @nec:before-app`        | `main('beforeApp')`       | middleware y setup previo a `express()`     |
| `templates/base/src/main.ts`                    | `// @nec:before-json`       | `main('beforeJson')`      | body parsers                                |
| `templates/base/src/main.ts`                    | `// @nec:before-listen`     | `main('beforeListen')`    | web-push (`setVapidDetails`)                |
| `templates/base/src/main.ts`                    | `// @nec:after-listen`      | `main('afterListen')`     | socket.io                                   |
| `templates/base/src/config/index.ts`            | `// @nec:config`            | `config()`                | `DB`, `MAILER`, `VAPID` y cualquier config  |
| `templates/base/.env.example`                   | `# @nec:env`                | `env()`                   | variables sueltas                           |
| `templates/base/.env.example`                   | `# @nec:<marker>:start/end` | `envBlock(marker, …)`     | bloques reemplazables (mailer, webpush, DB) |

Prisma 7 usa un **multi-file schema**: `templates/generator/orm/prisma/schema.prisma`
solo contiene `generator` y `datasource`, y `install:auth` copia
`src/database/prisma/schemas/auth.prisma` con sus modelos. No hay merge ni
anchor en proyectos nuevos, por lo que no se toca el schema del usuario.

Por compatibilidad, si un proyecto antiguo conserva el bloque
`// @nec:auth:start` / `// @nec:auth:end` (o el anchor `// @nec:prisma`), el
generador mantiene ese camino y actualiza el bloque en lugar de crear el archivo
nuevo; así no se duplican modelos. Si encuentra modelos de auth sueltos en
`schema.prisma`, avisa y no escribe `schemas/auth.prisma`. El motor de bloques
aborta si encuentra un bloque incompleto. Los marcadores legacy se exportan como
`PRISMA_ANCHOR` y `AUTH_PRISMA_BLOCK_MARKERS` (`src/patch/anchors.ts`) para que
los generadores no contengan markers literales.

Los anchors son un contrato público: si renombras uno, los proyectos generados
con versiones anteriores dejan de recibir parches. En ese caso el wiring devuelve
`anchor-missing`, no escribe nada y muestra un warning; nunca corrompe el archivo.

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

Los métodos de staging (`import`, `main`, `config`, `env`, `envBlock`, `block`)
devuelven `void`: el resultado real solo lo dan `commit()` o `transaction()`. Así
no se puede interpretar un `changed` que todavía no se escribió.

`transaction()` no es reentrante. Si hay operaciones encoladas o un staging
fallido pendiente, lanza un error en vez de descartarlas en silencio; para
limpiar la cola de forma explícita se usa `discard()`.

Detalles del motor (`src/patch/`):

- `patchAtMarker(file, marker, snippet, options)` acepta un marker literal o un
  nombre de anchor; `patchAtAnchor` sigue existiendo como atajo.
- Los parches de un mismo archivo se aplican en **una sola escritura**. Si falta
  cualquier marker del grupo, no se escribe nada (`anchor-missing`) y el
  generador recibe un warning: nunca queda runtime sin import.
- Dos parches sobre el mismo anchor respetan el orden de declaración: `A` y
  después `B` producen `A` antes que `B`, tanto en `after` como en `before`.
- Los imports se deduplican por módulo, aceptando comillas simples/dobles y
  espacios distintos. `sort: true` solo ordena bloques de imports de una línea;
  si hay imports multilínea o comentarios, el bloque se deja intacto.
- `patchBlock` mantiene bloques `@nec:<marker>:start` / `@nec:<marker>:end`.
- El filesystem del motor es inyectable (`PatchFileSystem`) para tests.
- La feature se escribe en `cli.config.json` solo si el lifecycle termina bien y
  el wiring no devolvió warnings. Un wiring con warnings no lanza, pero impide
  marcar la feature: el comando pide corregir el anchor y reintentar.

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

Todo comando se declara una vez en `commands` (`src/registry.ts`); de ahí salen el
dispatch, el `--help`, las opciones y la validación de requisitos. No hay que
tocar `src/index.ts` ni `src/cli.ts`.

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

4. Escribe tests: el contrato de `test/contracts/installers.test.ts` recorre
   todos los `install:*` automáticamente (idempotencia, estado y placeholders).
   Si la feature tiene wiring o scripts propios, añade una aserción específica.

El instalador toca tres sitios: el spec, la línea del registry y la entrada en
`FEATURES`. `FEATURES` solo declara el nombre de la feature para que el tipo y
`cli.config.json` la conozcan; `installer(spec)` deriva el comando
`install:<feature>`.

### `make:*` (generador de archivos)

Ejemplo: `make:cache`. No es una feature instalable: no toques `FEATURES` ni
`markInstalled`.

1. Crea `src/generators/cache.generator.ts` implementando `IPreGenerator` e
   `IFileSystemGenerator`:

```ts
export class CacheGenerator implements IPreGenerator, IFileSystemGenerator {
  private name: string

  constructor(private readonly ctx: Context) {}

  async pre(): Promise<void> {
    const name = await this.ctx.prompter.input({ message: 'Name of cache:', name: 'name' })
    this.name = validateIdentifier(name, 'Cache name')
  }

  async createDirectories(): Promise<void> {
    this.ctx.project.ensureDir('src/cache')
  }

  async copyFiles(): Promise<void> {
    const files = [
      {
        path: `src/cache/${kebabCase(this.name)}.ts`,
        content: renderTemplate(this.ctx.project.template('generator/cache/store.template.ts'), {
          ServiceName: pascalCase(this.name),
        }),
      },
      // …otros archivos del comando
    ]

    this.ctx.project.assertCanCreate(files.map((file) => file.path))

    for (const file of files) {
      this.ctx.project.write(file.path, file.content, 'create')
    }
  }
}
```

2. Usa `ctx.prompter.input({ name: 'name' })` para que `--no-interaction` pueda
   leer `--name` o el primer posicional. Para nombres que se normalizan a rutas
   usa `validateIdentifier`: rechaza vacíos, nombres solo de símbolos, demasiado
   largos y separadores de ruta. Para valores que se interpolan en un comando de
   shell usa `validateCommandName`. Si el comando depende del ORM, declara
   `requires: [{ feature: 'orm', hint: '…' }]` en el registry.

3. Escribe con política `create`: el comando falla si el archivo existe y
   `--force` es la salida explícita. Si el comando crea varios archivos, calcula
   primero todas las rutas y llama a `this.ctx.project.assertCanCreate(paths)`
   antes de la primera escritura. No sobrescribas archivos del usuario.

4. Registra el comando:

```ts
{
  name: 'make:cache',
  description: 'Generate a new cache class',
  requiresProject: true,
  options: { name: NAME_OPTION },
  create: (ctx) => new CacheGenerator(ctx),
}
```

5. Añade un test en `test/generators/` con un `cwd` temporal y un prompter falso.
   Si modifica `main.ts`, añade también un golden test.

### Comando custom

Si necesita prompts, elegir entre varios ORMs o ejecutar shell propio (como
`auth`, `orm` o `make:migration`), crea un generador en `src/generators/` y
regístralo con `create: (ctx) => new XGenerator(ctx)`. Sigue el lifecycle de
`src/run.ts` y usa `ctx.project`/`ctx.wiring` como el resto.

Todos los comandos declaran `requiresProject`; solo `init` usa `false`. Si un
comando necesita una feature instalada, declara
`requires: [{ feature: 'orm', hint: 'Run "node-express-cli install:orm" first.' }]`.
El hint se muestra tal cual en `src/cli.ts`; no añadas switches de requisitos
en el entrypoint. `install:auth` exige además `mailer` con
`hint: 'Run "node-express-cli install:mailer" first.'`.

Declara los flags propios en `options` del registry. Llegan en `ctx.args.flags`
y solo aparecen en el help de ese comando. Usa `booleanFlag`/`stringFlag` de
`src/utils/args.ts` para leerlos con tipos.

### Reglas comunes

- No importes `configService`/`shellService`: no existen.
- Escribe siempre con `ctx.project` y sus políticas; no uses `fs.writeFileSync` para archivos del proyecto.
- Modifica archivos existentes solo con `ctx.wiring`; no uses `@nec:` ni `patchAtAnchor` en generadores.
- Los specs declaran `wire`/`scripts`; no meten `@nec:` ni llaman a `patchAtAnchor`.
- Usa `ctx.cwd` (o pasa `ctx.cwd` a `execAsync`) en vez de rutas relativas a `process.cwd()`.
- El lifecycle debe poder ejecutarse dos veces sin duplicar archivos, imports ni scripts.
- Los prompts deben llevar `name` para funcionar con `--no-interaction`.
- Actualiza `README.md` y este documento si cambia el contrato visible para el usuario.

## Tests

```bash
npm test            # unit + golden, rápido y sin red
npm run test:smoke  # init + orm + auth: proyecto real + tsc --noEmit (lento)
npm run test:smoke:all # todas las features sobre un mismo proyecto (más lento)
```

| Tipo         | Ubicación                                                  | Qué cubre                                                                                                                           |
| ------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Unit         | `test/utils`, `test/services`, `test/patch`, `test/wiring` | helpers, configuración, `ProjectService`/manifest, markers, bloques, `WiringService`                                                |
| CLI          | `test/cli`                                                 | dispatch, `requiresProject`/`requires`, `ctx.args`, `--dry-run` y snapshot de `--help`                                              |
| Instaladores | `test/installers`                                          | specs, `SpecGenerator`, base sin features opcionales, `installer(spec)`                                                             |
| Contratos    | `test/contracts`                                           | todos los `install:*`: idempotencia, líneas custom, placeholders, estado, scripts y el conjunto completo de features en un proyecto |
| Generadores  | `test/generators`, `test/commands`                         | routing, módulos, auth, mailer, push, migraciones, sockets, `route:list`                                                            |
| Golden       | `test/golden`                                              | `init` + `install:orm` + `install:auth`: árbol de archivos, `main.ts`, `cli.config.json`                                            |
| Smoke        | `test/smoke`                                               | proyecto real + `tsc --noEmit`; solo con `NEC_SMOKE=1`                                                                              |

Los snapshots están en `test/golden/__snapshots__/` y `test/cli/__snapshots__/`. Si el cambio es
intencional, actualízalos con `npm test -- -u` y revísalos en el diff.

El smoke test usa `SMOKE_PROFILE` (`core` por defecto o `all`),
`SMOKE_PACKAGE_MANAGER` (`npm`/`pnpm`), `SMOKE_FILE_BASED` (`true`/`false`) y
`SMOKE_ORM` (`typeorm` por defecto, o `mongoose`/`sequelize`/`prisma`).
`core` genera el proyecto con `init + orm + mailer + auth`; `all` instala además
todas las features declarativas y comprueba que `features` las contiene todas.
Para Prisma el smoke crea un `.env` con `DB_URL` ficticio para que
`prisma generate` se ejecute de verdad antes de `tsc`.

## CI

- Job `test`: `npm ci`, `npm run build`, `npm test`.
- Job `smoke`: matriz `{npm, pnpm} × {fileBasedRouting true,false}` con
  `SMOKE_PROFILE=core`; instala un proyecto generado con TypeORM y corre
  `tsc --noEmit`.
- Job `smoke-orms`: matriz `{mongoose, sequelize, prisma} × {fileBasedRouting true,false}`
  con npm; valida que auth compila con cada repositorio.
- Job `smoke-all`: un proyecto con todas las features (`SMOKE_PROFILE=all`) que
  debe compilar. Es el criterio de que cada feature instalable se compila al
  menos una vez.

Cualquier cambio que rompa un template debe fallar en CI, no en la máquina del
usuario.

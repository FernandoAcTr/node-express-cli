# AGENTS.md

## What this repo is

- `node-express-cli` is a TypeScript CLI that **scaffolds** Express + TS projects. It is not an Express app itself.
- `src/` = the CLI. `templates/` = files copied into generated projects (`base/` for `init`, `generator/` for every other command). `docs/` holds images and `docs/architecture.md`.
- Published bins `node-express-cli` and `nec` both point to `dist/index.js`.

## Commands

- Build: `npm run build` (runs `tsc`, emits `dist/`). `prepare` also builds, so it runs automatically on install.
- Run the CLI locally: `npm run build && node dist/index <command>`.
- Test: `npm test` (vitest, only `test/**/*.test.ts`). Unit + golden tests, no network.
- Smoke test: `npm run test:smoke` (sets `NEC_SMOKE=1`). Generates a real project, installs dependencies and runs `tsc --noEmit`; slow, so it is skipped by default. CI runs it in a `{npm, pnpm} × {fileBasedRouting true,false}` matrix (`.github/workflows/ci.yml`).
- Format: `npm run prettier:fix` — the only scripted formatting check.
- There is **no** lint or separate typecheck script; `npm run build` is the typecheck. `npm test` covers helpers, config, context, registry, run, patches, key generators, golden project output and `route:list`; `templates/generator/common/tests` is scaffolding for _generated_ projects.

## Gotchas

- `templates/` is excluded in `tsconfig.json`. Template `.ts` files are copied as text and never compiled or type-checked by `tsc`; the smoke test (`npm run test:smoke`) is what catches compile errors in them by generating a project and running `tsc --noEmit`.
- Golden snapshots live in `test/golden/__snapshots__/`. If you change the generated project on purpose, update them with `npm test -- -u` and review the diff.
- Template placeholders are substituted by string replace and must be preserved exactly: `__ServiceName__`, `__servicefile__`, `__modulename__`, `__ClassName__`, `__EntityName__`, `__PRISMA_SEED_COMMAND__`.
- Config key is intentionally misspelled `package_manger` (in `src/types/index.ts`, `cli.config.json`, all code). Keep it.
- Version lives in two places: `package.json` and `src/version.ts`. `src/version.ts` is what gets written into a generated project's `cli.config.json`. Update both and keep them in sync.
- Never hardcode `npm`, `npm run` or `npx` in generators/templates. Use `ConfigService.getInstallCommand()`, `getDevInstallCommand()`, `getRunCommand()`, `getPackageRunnerCommand()` and `setScript`/`setScripts`.
- Root `.prettierrc.json` differs from the one shipped to generated projects (`templates/generator/common/prettier/.prettierrc.json`). Edit the right one.

## Adding a command

1. Add a generator in `src/generators/` implementing whichever lifecycle interfaces it needs (`src/interfaces/generator.interface.ts`). It receives a `Context` (`config`, `project`, `shell`, `prompter`, `logger`, `fs`, `cwd`, `force`, `has`, `markInstalled`) via its constructor; do not import `configService`/`shellService` singletons (they no longer exist).
2. Register it **once** in the `commands` array of `src/registry.ts` with `name`, `description`, optional `aliases`, `requires` (`orm`, `fileBasedRouting`), optional `requiresProject` (defaults to true; only `init` sets it to false), `feature`, `options` and `create(ctx, args)`. `src/index.ts` resolves dispatch from that registry and `src/utils/yargs.ts` generates `--help` from it. Install commands set `feature` so `run()` can call `ctx.markInstalled(feature)`. Use `ctx.has(feature)` to skip work that is already installed; the lifecycle must stay idempotent.
3. Lifecycle order is fixed by `src/run.ts`: `pre` -> `createDirectories` + `copyFiles` -> `installDependencies` -> `post` -> `run`. Only implemented phases run. If a phase throws, the optional `rollback()` hook runs before the error propagates (used by `init` to remove a half-created project).
4. For non-interactive use, pass a `name` on each prompt option so `--no-interaction` can read it from a flag or positional argument.
5. Write project files through `ctx.project`, never with `fs.writeFileSync`/`copyFileSync` and `./src` paths. `ProjectService` enforces `.nec/manifest.json` hashes and `WritePolicy` (`create`, `skip`, `overwrite`, `overwrite-if-unmodified`); `--force` is exposed as `ctx.force`. Pass `ctx.cwd` to `execAsync` instead of relying on `process.cwd()`.
6. See `docs/architecture.md` for the full walkthrough, including tests and the patch/anchor contract.

- Template paths resolve via `path.resolve(__dirname, '../../templates/...')`, so `templates/` must ship next to `dist/` (it does; `.npmignore` excludes only `src`, configs, `logs`, `docs`).

## Generated-project facts (relevant when editing templates/generators)

- Entrypoint is `src/main.ts`; compiled output is `build/` (not `dist/`). Module alias `@/*` -> `src/*`, rewritten at runtime by `tsc-alias`.
- `src/main.ts` is a single template with `// @nec:*` anchors. Installers must patch it through `src/patch/anchor.ts` (`patchAtAnchor`) and must never copy a whole `main.ts` over it.
- Routing lives in `src/routing/index.ts`, chosen by `init` from `templates/base/src/routing/{modules,filebased}.ts`. `fileBasedRouting: true` uses `src/routes/**` (folders like `[id]` become `:id`); otherwise `src/modules/**`.
- `cli.config.json` records `orm` (`mongoose|typeorm|sequelize|prisma`), `package_manger`, `fileBasedRouting`, `version` and `features`. `features` is written after a successful install command and is what `ctx.has(...)` checks (with legacy fallbacks for `orm`/`fileBasedRouting`).
- `.nec/manifest.json` records the SHA-256 of every generated file. Do not edit it by hand; delete it to make the next command regenerate it, and do not commit code that assumes every project has one (older projects do not).
- The generated `dev` script uses `tsc-watch`; if `build/` does not exist yet it may need to be stopped and re-run once.

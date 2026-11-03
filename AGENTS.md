# AGENTS.md

## What this repo is
- `node-express-cli` is a TypeScript CLI that **scaffolds** Express + TS projects. It is not an Express app itself.
- `src/` = the CLI. `templates/` = files copied into generated projects (`base/` for `init`, `generator/` for every other command). `docs/` is images only.
- Published bins `node-express-cli` and `nec` both point to `dist/index.js`.

## Commands
- Build: `npm run build` (runs `tsc`, emits `dist/`). `prepare` also builds, so it runs automatically on install.
- Run the CLI locally: `npm run build && node dist/index <command>`.
- Test: `npm test` (vitest, only `test/**/*.test.ts`).
- Format: `npm run prettier:fix` — the only scripted formatting check.
- There is **no** lint or separate typecheck script; `npm run build` is the typecheck. The CLI test suite only covers `src/utils` helpers; `templates/generator/common/tests` is scaffolding for *generated* projects.

## Gotchas
- `templates/` is excluded in `tsconfig.json`. Template `.ts` files are copied as text and never compiled or type-checked, so the compiler will not catch errors in them.
- Template placeholders are substituted by string replace and must be preserved exactly: `__ServiceName__`, `__servicefile__`, `__modulename__`, `__ClassName__`, `__EntityName__`, `__PRISMA_SEED_COMMAND__`.
- Config key is intentionally misspelled `package_manger` (in `src/types/index.ts`, `cli.config.json`, all code). Keep it.
- Version lives in two places: `package.json` and `src/version.ts`. `src/version.ts` is what gets written into a generated project's `cli.config.json`. Update both (currently out of sync: `3.2.2` vs `3.2.1`).
- Root `.prettierrc.json` differs from the one shipped to generated projects (`templates/generator/common/prettier/.prettierrc.json`). Edit the right one.

## Adding a command
1. Add a generator in `src/generators/` implementing whichever lifecycle interfaces it needs (`src/interfaces/generator.interface.ts`). It receives a `Context` (`config`, `shell`, `prompter`, `logger`, `fs`, `cwd`, `has`) via its constructor; do not import `configService`/`shellService` singletons (they no longer exist).
2. Register it **once** in the `commands` array of `src/registry.ts` with `name`, `description`, optional `aliases`, `requires` (`orm`, `fileBasedRouting`), `options` and `create(ctx, args)`. `src/index.ts` resolves dispatch from that registry and `src/utils/yargs.ts` generates `--help` from it.
3. Lifecycle order is fixed by `src/run.ts`: `pre` -> `createDirectories` + `copyFiles` -> `installDependencies` -> `post` -> `run`. Only implemented phases run.
4. For non-interactive use, pass a `name` on each prompt option so `--no-interaction` can read it from a flag or positional argument.
- Template paths resolve via `path.resolve(__dirname, '../../templates/...')`, so `templates/` must ship next to `dist/` (it does; `.npmignore` excludes only `src`, configs, `logs`, `docs`).

## Generated-project facts (relevant when editing templates/generators)
- Entrypoint is `src/main.ts`; compiled output is `build/` (not `dist/`). Module alias `@/*` -> `src/*`, rewritten at runtime by `tsc-alias`.
- `src/main.ts` is a single template with `// @nec:*` anchors. Installers must patch it through `src/patch/anchor.ts` (`patchAtAnchor`) and must never copy a whole `main.ts` over it.
- Routing lives in `src/routing/index.ts`, chosen by `init` from `templates/base/src/routing/{modules,filebased}.ts`. `fileBasedRouting: true` uses `src/routes/**` (folders like `[id]` become `:id`); otherwise `src/modules/**`.
- `cli.config.json` records `orm` (`mongoose|typeorm|sequelize|prisma`), `package_manger`, `fileBasedRouting`, and `version`.
- The generated `dev` script uses `tsc-watch`; if `build/` does not exist yet it may need to be stopped and re-run once.

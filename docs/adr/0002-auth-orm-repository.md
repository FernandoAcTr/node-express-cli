# ADR 0002 — Auth multi-ORM con repositorio y Prisma 7

- **Estado:** aceptado
- **Fecha:** 2026-11-03

## Contexto

`install:auth` nació con un `auth.service.ts` distinto por ORM. Los cuatro
servicios duplicaban login, registro, refresh tokens y el manejo de fechas; los
endpoints de logout, reset, verificación y `/me` no existían. Además, las
entidades no compartían contrato: Sequelize/Mongo/Prisma no tenían
`email_verified_at`, Prisma no tenía `email` único, el TTL del refresh en Mongo
era de un día y la migración de reset de TypeORM usaba otra tabla.

Prisma 7 añadió otro cambio: `prisma.config.ts` con `datasource.url`,
`provider = "prisma-client"` con `output`, cliente generado fuera de
`node_modules` y un driver adapter obligatorio.

## Opciones consideradas

### A. Mantener un servicio por ORM

Es la situación anterior. Los endpoints nuevos se implementan cuatro veces y
cada corrección de seguridad (rotación de refresh, expiración, reset) hay que
replicarla. Se descarta.

### B. Generar un servicio con fragmentos de template

El generador compondría el servicio con snippets por ORM. Reduce la duplicación
en disco, pero el template resultante sigue teniendo lógica condicional y es más
difícil de testear que un contrato explícito. Se descarta.

### C. Repositorio por ORM + dominio compartido (elegido)

`src/modules/auth/auth.service.ts` contiene toda la lógica y depende de
`AuthRepository` (`auth.types.ts`). Cada ORM implementa únicamente:

- entidades/migraciones (o el schema Prisma);
- `auth.repository.ts`, que traduce el modelo al contrato normalizado
  (`_id` → `id`, `createdAt` → `created_at`, etc.).

El generador tiene un descriptor `AUTH_ORMS` con las rutas de templates. Añadir
un ORM nuevo es entidades + repositorio + una entrada en el descriptor.

Ventajas:

- un único lugar para tokens, expiraciones, hash y flujos;
- los tests de contrato comparan la misma superficie en los cuatro motores;
- las diferencias de sintaxis quedan aisladas en el repositorio;
- los endpoints y `passport.ts` son idénticos.

Costes:

- una indirección adicional;
- las entidades y migraciones siguen siendo por ORM (no se pueden abstraer sin
  generar SQL o un DSL propio);
- el repositorio debe mapear fechas/IDs con cuidado.

## Decisión sobre Prisma 7

- `prisma.config.ts` con `schema: './src/database/prisma'`,
  `datasource.url = env('DB_URL')` y `migrations.seed`.
- `schema.prisma` solo con `generator client` (`provider = "prisma-client"`,
  `output = "./generated"`, `moduleFormat = "cjs"`) y `datasource db`
  (`provider = "mysql"`).
- Cliente en `src/database/client.ts` con `@prisma/adapter-mariadb`; el
  connection string del CLI usa `DB_*` y no el `DB_URL` para evitar problemas de
  parseo con usuarios que contienen `@`.
- `install:auth` escribe `src/database/prisma/schemas/auth.prisma` (multi-file
  schema). Los proyectos antiguos con el bloque `// @nec:auth:start` conservan
  ese camino para no duplicar modelos.
- Dependencias fijadas a `^7` para no saltar a Prisma 8.
- Si falta `.env`/`DB_URL`, `prisma generate` se omite con un aviso; el usuario
  crea `.env` y ejecuta `m:generate`.

## Consecuencias

- `install:auth` requiere `install:mailer` para verificación y reset.
- El contrato de auth es un punto público: `auth.types.ts` y los endpoints
  deben mantenerse estables entre ORMs.
- El smoke de CI pasa a cubrir `orm × fileBasedRouting` con `tsc --noEmit`.
- Cambiar de ORM en un proyecto existente sigue bloqueado; las entidades de auth
  se regeneran con el ORM activo.

# ADR 0001 — Anchors + `WiringService` frente a providers auto-descubiertos

- **Estado:** aceptado
- **Fecha:** 2026-11-03
- **Contexto:** Fase 6 del plan `docs/plans/refactor-extensibilidad-comandos.md`

## Contexto

Cada feature instalable tiene que integrarse con archivos que ya existen en el
proyecto generado: `src/main.ts`, `src/config/index.ts`, `.env.example` y
`package.json`. Hoy esa integración se hace con anchors `@nec:*` y
`WiringService`: el CLI conoce los puntos de extensión y aplica parches
atómicos e idempotentes.

Añadir una feature requiere, como mucho, cuatro piezas:

1. templates en `templates/generator/…`;
2. un `InstallerSpec` (o un generador custom);
3. una línea en `src/registry.ts`;
4. una entrada en `FEATURES`.

La pregunta de este ADR es si conviene sustituir ese modelo por _providers_
auto-descubiertos, al estilo del routing file-based de frameworks como Next o
Nest: el proyecto generado escanea `src/providers/*.ts` y cada archivo registra
sus hooks en runtime.

## Opciones consideradas

### A. Anchors + `WiringService` (estado actual)

El CLI modifica archivos conocidos en puntos marcados:

```ts
const result = ctx.wiring.transaction((wiring) => {
  wiring.import("import webpush from 'web-push'")
  wiring.main('beforeListen', 'webpush.setVapidDetails(...)', { key: 'setVapidDetails(' })
})
```

Ventajas:

- el resultado es explícito y aparece en el diff del proyecto generado;
- los errores se detectan al instalar, no al arrancar la app;
- la idempotencia está centralizada y cubierta por tests de contrato;
- no hay magia de runtime ni orden implícito de ejecución;
- un anchor ausente produce `anchor-missing` + warning, sin corromper el archivo.

Costes:

- el CLI está acoplado a la forma de `main.ts`, `config/index.ts` y `.env.example`;
- cada archivo nuevo que admita extensiones necesita su anchor y su método de wiring;
- los templates deben conservar los anchors exactos.

### B. Providers auto-descubiertos

`src/main.ts` llamaría a un `registerProviders(app, server, config)` que descubre
`src/providers/*.ts`. Instalar una feature consistiría en copiar un provider:

```ts
// src/providers/webpush.ts
export function register({ config }: ProviderContext) {
  webpush.setVapidDetails(config.VAPID.SUBJECT, config.VAPID.PUBLIC_KEY, config.VAPID.PRIVATE_KEY)
}
```

Ventajas:

- instalar una feature no toca `main.ts`;
- el proyecto generado se parece más a un framework con plugin system;
- el CLI deja de conocer los anchors.

Costes:

- el orden de ejecución pasa a depender del nombre de archivo o de un barrel generado;
- los errores de integración aparecen al arrancar la app, no al instalar;
- las features actuales (`auth`, `socket`, `push`) necesitan acceso a `server`,
  middleware y orden relativo; un contrato único de provider se queda corto;
- sigue haciendo falta tocar `config/index.ts`, `.env.example` y `package.json`,
  así que no elimina el wiring, solo mueve una parte;
- introduciría un sistema de plugins propio que el usuario tendría que aprender;
- complica los tests rápidos: habría que arrancar la app o simular el escaneo.

### C. Híbrido

Mantener anchors para configuración, entorno y scripts, y añadir providers solo
para hooks de arranque. Es una opción razonable si en el futuro las integraciones
de `main.ts` crecen mucho, pero hoy duplicaría dos mecanismos para el mismo
trabajo.

## Decisión

Se mantiene la opción **A** (anchors + `WiringService`).

Con 8 features y 5 anchors en `main.ts`, el coste de mantener el wiring es menor
que el de introducir un runtime de plugins. Además, el wiring actual ya está
probado de extremo a extremo: contrato por instalador, test del conjunto completo
y smoke con `tsc --noEmit`.

## Consecuencias

- Los anchors son un contrato público y están documentados en
  `docs/architecture.md`; renombrarlos exige tratar los proyectos viejos con
  `anchor-missing` + warning.
- Todo `install:*` nuevo pasa por `test/contracts/installers.test.ts` y, si toca
  `main.ts`, por el golden test.
- No se añade un directorio `src/providers/` ni un registro en runtime.

## Cuándo revisar esta decisión

Abrir un nuevo ADR que reemplace a este si se cumple alguno de estos disparadores:

- más de ~15 integraciones que toquen `main.ts`;
- necesidad de que terceros publiquen plugins sin modificar el CLI;
- un archivo de wiring con más de ~20 combinaciones condicionales;
- requisitos de orden de arranque que los anchors no puedan expresar.

Plan de migración si se revisa: introducir `src/providers` y
`registerProviders()` detrás de una feature opcional, migrar primero `socket` y
`push` (los hooks de `server`), y conservar anchors para config, env y scripts.

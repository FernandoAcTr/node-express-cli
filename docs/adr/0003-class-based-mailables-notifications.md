# ADR 0003 — Emails y notificaciones modelados como clases

- **Estado:** aceptado
- **Fecha:** 2026-11-03

## Contexto

`install:mailer` solo instalaba `Mailer` y un template de notificación. Cada
llamada construía el HTML a mano desde un objeto `NotificationOptions`, y no
había una forma reutilizable de modelar emails o notificaciones. El proyecto de
referencia Vending360 usa `Mailable` + `IMail` para emails y `Notifiable` +
`INotification` para notificaciones multicanal, pero su implementación depende
directamente de TypeORM, `web-push` y `socket.io`.

Copiar ese acoplamiento a `install:mailer` habría obligado a instalar ORM, push y
socket antes de enviar un correo, y habría arrastrado esas dependencias a
`install:auth`.

## Decisión

### Mailer independiente

`install:mailer` instala:

- `Mailer` con `html`/`template`/`payload` y `sendNotification` compatible.
- `Mailable.from(emailOrUser).send(new XEmail(...))` con `IMail.configure()`.
- `Notifiable.from({ id, email }).notify(new XNotification(...))` con
  `INotification` (`toMail`, `toDb`, `toPush`, `dbType`).
- `src/notifications/registry.ts` con `NotificationChannel` y
  `NotificationStore`; mailer solo ejecuta el canal email.

Así un proyecto puede enviar emails sin ORM, sin base de datos y sin push.

### Notificaciones como feature separada

`install:notifications` requiere `install:auth` (que ya exige `orm` y `mailer`).
Aporta la entidad/migración por ORM, el repositorio, el `notificationStore`, el
canal `database` y los endpoints autenticados. `src/main.ts` importa
`./notifications/channels` para registrar canales y store.

Los canales `push` y `socket` son opcionales:

- push se genera si `install:push` está instalado antes; añade
  `push_subscriptions`, sus endpoints y el canal push;
- socket se genera si `install:socket` está instalado y su `Socket` expone
  `emitToUser`; si el archivo es de una versión anterior, se avisa y se usa un
  emisor no-op para no romper `tsc`.

### Auth usa el patrón

Los correos de verificación y reset pasan a ser `PasswordResetEmail` y
`VerifyEmailEmail`; `auth.mailer.ts` solo construye la URL y elige la clase.

## Consecuencias

- `install:mailer` deja de ser un simple wrapper de `sendNotification`: ahora es
  el contrato público de emails/notificaciones.
- Los canales y el store se registran en runtime; mailer no importa ORM ni
  repositorios.
- `install:notifications` es la primera feature que depende de `auth` para sus
  endpoints.
- El orden de instalación importa para push/socket: sus canales solo se generan
  si la feature ya está presente.
- Los proyectos generados con `socket` anterior deben regenerar `src/socket.ts`
  (o añadir `Socket.emitToUser`) para habilitar el tiempo real; el generador
  detecta el caso y degrada sin romper la compilación.

import { InstallerSpec, WireStep } from '../spec'

/** Configuración de base de datos que solo tiene sentido cuando hay un ORM. */
export const ORM_CONFIG = `  DB: {
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
    HOST: process.env.DB_HOST,
    PORT: process.env.DB_PORT,
    NAME: process.env.DB_NAME,
    URI: process.env.DB_URI,
  },`

export const ORM_ENV = `DB_USER=
DB_PASSWORD=
DB_HOST=
DB_PORT=
DB_NAME=
DB_URI=
DB_URL=`

export const ormSpec: InstallerSpec = {
  feature: 'orm',
  description: 'Add Database support using an orm',
  wire: [
    { kind: 'config', code: ORM_CONFIG, key: 'DB:' },
    { kind: 'envBlock', marker: 'database', code: ORM_ENV, key: 'DB_USER=' },
  ],
}

/** Pasos reutilizados por el `OrmGenerator` custom. */
export function ormWireSteps(): WireStep[] {
  return [...(ormSpec.wire ?? [])]
}

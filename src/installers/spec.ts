import { ContextFeature } from '../context'
import { AnchorName } from '../patch/anchors'
import { ConfigService } from '../services/config.service'
import { WritePolicy } from '../services/project.service'
import { Feature } from '../types'

/** Valor que puede depender del package manager/configuración del proyecto. */
export type SpecValue = string | ((config: ConfigService) => string)

export interface SpecFile {
  /** Ruta dentro de `templates/`, p. ej. `generator/common/mailer/mailer.ts`. */
  from: string
  /** Ruta de destino dentro del proyecto, p. ej. `src/utils/mailer.ts`. */
  to: string
  policy?: WritePolicy
  /** `copyFiles` copia antes de instalar; `post` solo copia si el wiring fue bien. */
  stage?: 'copyFiles' | 'post'
}

export interface SpecCopyDir {
  /** Directorio dentro de `templates/`. */
  from: string
  /** Directorio de destino dentro del proyecto. */
  to: string
  policy?: WritePolicy
  stage?: 'copyFiles' | 'post'
}

export type WireStep =
  | { kind: 'import'; statement: string; key?: string; position?: 'before' | 'after'; sort?: boolean }
  | { kind: 'main'; anchor: AnchorName; code: string; key?: string; position?: 'before' | 'after' }
  | { kind: 'config'; code: SpecValue; key?: string; position?: 'before' | 'after' }
  | { kind: 'env'; code: SpecValue; key?: string; position?: 'before' | 'after' }
  | { kind: 'envBlock'; marker: string; code: SpecValue; key?: string }
  | { kind: 'block'; file: string; marker: string; code: SpecValue; key?: string; after?: string; comment?: '//' | '#' }

export interface InstallerSpec {
  feature: Feature
  description: string
  requires?: ContextFeature[]
  deps?: string[]
  devDeps?: string[]
  dirs?: string[]
  files?: SpecFile[]
  copyDir?: SpecCopyDir[]
  scripts?: Record<string, string> | ((config: ConfigService) => Record<string, string>)
  wire?: WireStep[]
  success?: string[] | ((config: ConfigService) => string[])
  /** Texto del reporter cuando un archivo ya estaba actualizado. */
  skippedSuffix?: string
}

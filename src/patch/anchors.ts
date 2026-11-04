export const ANCHOR_MARKERS = {
  imports: '@nec:imports',
  beforeApp: '@nec:before-app',
  beforeJson: '@nec:before-json',
  beforeListen: '@nec:before-listen',
  afterListen: '@nec:after-listen',
} as const

export type AnchorName = keyof typeof ANCHOR_MARKERS

/** Anchor del schema de Prisma donde se añaden bloques de features (auth). */
export const PRISMA_ANCHOR = '// @nec:prisma'

/** Marcadores del bloque de auth en schemas Prisma de proyectos antiguos. */
export const AUTH_PRISMA_BLOCK_MARKERS = {
  start: '// @nec:auth:start',
  end: '// @nec:auth:end',
} as const

export function anchorComment(anchor: AnchorName): string {
  return `// ${ANCHOR_MARKERS[anchor]}`
}

export const ANCHOR_MARKERS = {
  imports: '@nec:imports',
  beforeApp: '@nec:before-app',
  beforeJson: '@nec:before-json',
  beforeListen: '@nec:before-listen',
  afterListen: '@nec:after-listen',
} as const

export type AnchorName = keyof typeof ANCHOR_MARKERS

export function anchorComment(anchor: AnchorName): string {
  return `// ${ANCHOR_MARKERS[anchor]}`
}

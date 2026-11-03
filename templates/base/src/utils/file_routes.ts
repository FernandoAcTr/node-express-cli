export function buildURLPath(segments: string[]): string {
  const final = segments.map((val) => (val.startsWith('[') && val.endsWith(']') ? `:${val.slice(1, val.length - 1)}` : val))
  return ('/' + final.join('/').replace('//', '')).replace('//', '/')
}

export function routeResourceName(fileName: string): string {
  return fileName === 'index.js' || fileName === 'index.ts' ? '/' : fileName.replace(/\.(js|ts)$/, '')
}

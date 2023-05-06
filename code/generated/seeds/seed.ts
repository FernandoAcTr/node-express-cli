export interface Seed {
  name: string
  seed(): Promise<void>
}

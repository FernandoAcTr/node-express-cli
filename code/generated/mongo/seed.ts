export interface Seed {
  id: string
  seed(): Promise<void>
}

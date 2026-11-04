import { InstallerSpec } from '../spec'

export const testsSpec: InstallerSpec = {
  feature: 'tests',
  description: 'Add a library to do testing and some examples',
  deps: ['@faker-js/faker'],
  devDeps: ['jest', '@types/jest', 'ts-jest', 'supertest', '@types/supertest'],
  dirs: ['src/tests'],
  files: [{ from: 'generator/common/tests/jest.config.js', to: 'jest.config.js' }],
  copyDir: [{ from: 'generator/common/tests/tests', to: 'src/tests' }],
  scripts: { test: 'jest' },
}

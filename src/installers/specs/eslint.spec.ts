import { InstallerSpec } from '../spec'

export const eslintSpec: InstallerSpec = {
  feature: 'eslint',
  description: 'Add ESLint (flat config) to the project',
  requires: [{ feature: 'prettier', hint: 'Run "node-express-cli install:prettier" first.' }],
  devDeps: ['eslint@^10', '@eslint/js@^10', 'typescript-eslint@^8', 'eslint-config-prettier@^10'],
  files: [{ from: 'generator/common/eslint/eslint.config.mjs', to: 'eslint.config.mjs' }],
  scripts: {
    lint: 'eslint "src/**/*.ts"',
    'lint:fix': 'eslint "src/**/*.ts" --fix',
  },
}

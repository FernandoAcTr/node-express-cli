import { InstallerSpec } from '../spec'

export const eslintSpec: InstallerSpec = {
  feature: 'eslint',
  description: 'Add eslint to the project',
  devDeps: ['eslint', 'eslint-config-prettier', 'eslint-plugin-prettier', '@typescript-eslint/parser', '@typescript-eslint/eslint-plugin'],
  files: [{ from: 'generator/common/eslint/.eslintrc.js', to: '.eslintrc.js' }],
  scripts: {
    lint: 'eslint . --ext .ts',
    'lint:fix': 'eslint . --ext .ts --fix',
  },
}

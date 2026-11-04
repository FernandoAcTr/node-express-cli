import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: ['build/**', 'node_modules/**', 'logs/**', 'coverage/**', 'src/templates/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Prettier se ejecuta aparte (`npm run prettier:fix`); este config solo
  // desactiva las reglas de ESLint que chocan con el formato.
  prettier,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      // El scaffolding incluye firmas de Express y restos de destructuring que
      // no se usan; marcarlos como error hace que un proyecto recién creado no
      // pase `npm run lint`.
      '@typescript-eslint/no-unused-vars': 'off',
    },
  }
)

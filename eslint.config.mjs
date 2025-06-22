// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier/recommended'

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettier,
  {
    files: ['src/**/*.{js,ts,jsx,tsx}'],

    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-useless-escape': 'off'
    },
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/build/**',
      '**/out/**'
    ]
  }
)

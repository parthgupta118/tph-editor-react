import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Architectural boundary, enforced rather than merely documented.
  // src/core/** is the pure domain: no React, no DOM, no UI.
  // The only DOM-touching module is src/dom/selection.ts, deliberately outside core.
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message: 'core/ must stay pure — no React imports.',
            },
            {
              group: ['**/dom/*', '**/components/*', '**/hooks/*'],
              message:
                'core/ must not depend on the DOM adapter or the UI layer. Dependencies point inward only.',
            },
          ],
        },
      ],
    },
  },
])

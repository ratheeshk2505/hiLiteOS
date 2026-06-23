import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // These two are part of the newer React Compiler-oriented ruleset and
      // flag the standard "fetch data on mount inside useEffect" pattern
      // used throughout this app's pages. That pattern is still idiomatic
      // for a project not using the React Compiler / a data-fetching
      // library, so we relax them rather than restructure every page.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      // AuthContext intentionally exports the useAuth() hook alongside the
      // AuthProvider component — standard context-module pattern.
      'react-refresh/only-export-components': 'off',
    },
  },
])

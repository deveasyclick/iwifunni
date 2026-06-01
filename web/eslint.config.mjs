import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import nextPlugin from '@next/eslint-plugin-next';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

// Create a file-scoped copy of the requiring-type-checking configs so they
// only apply to files where `parserOptions.project` is set (see below).
const tsRequiresTypeChecking = compat
  .extends('plugin:@typescript-eslint/recommended-requiring-type-checking')
  .map((cfg) => ({ files: ['src/**/*.ts', 'src/**/*.tsx'], ...cfg }));

const eslintConfig = [
  // 1. Hard global ignores to stop the performance loop
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/dist/**',
      '**/.pnpm/**',
    ],
  },

  // 2. Fast lightweight language parsing
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        // Keep this lightweight for general parsing. Type-aware rules are
        // enabled separately for the `src/` folder to avoid large filesystem
        // crawls while restoring type-checked linting.
      },
    },
  },

  // 2b. Enable type-aware rules only for source files to avoid crawling
  // the entire repo. This points ESLint to the web/tsconfig.json so
  // @typescript-eslint can perform type-checked rules (typos, type errors).
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: [resolve(__dirname, 'tsconfig.json')],
        tsconfigRootDir: __dirname,
      },
    },
  },

  // 3. Next.js native rules
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  // 4. TypeScript recommended rules
  ...compat.extends('plugin:@typescript-eslint/recommended'),
  // Add type-aware rules that require `parserOptions.project`.
  ...tsRequiresTypeChecking,

  // 5. Prettier errors mapping
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },

  // 6. Prettier style overrides
  prettierConfig,
];

export default eslintConfig;

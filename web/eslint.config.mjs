import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import nextPlugin from '@next/eslint-plugin-next';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import checkFilePlugin from 'eslint-plugin-check-file';

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

  // 4b. Type-aware overrides (must be in the type-aware scope)
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      // Allow async functions in onClick/onChange etc. — the void return
      // pattern is intentional and safe here.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: false },
      ],
    },
  },

  // Hook files are pure logic with no JSX. The no-unsafe-* rules are too
  // strict with React Query's complex type inference, so we relax them here.
  {
    files: ['src/**/hooks/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },

  // 5. jsx-a11y rules — Prefer native interactive elements (<button>, <a>)
  // over divs/spans with onClick. If a non-interactive element must be
  // interactive, it needs an appropriate role and keyboard/touch support.
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx'],
    plugins: {
      'jsx-a11y': jsxA11yPlugin,
    },
    rules: {
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
    },
  },

  // 6. Filename conventions — React component files must use PascalCase.
  // Only enforced in `features/` where custom components live.
  // Barrel files (index.tsx) and known kebab-case config files are excluded.
  {
    files: ['src/features/**/*.tsx'],
    ignores: [
      'src/features/**/index.tsx',
      'src/features/workflows/definition-builder/canvas-edge.tsx',
      'src/features/workflows/definition-builder/canvas-node.tsx',
    ],
    plugins: {
      'check-file': checkFilePlugin,
    },
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/*.tsx': 'PASCAL_CASE',
        },
      ],
    },
  },

  // 7. React rules — only for source files to avoid ESLint 10 context issues
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx'],
    plugins: {
      react: reactPlugin,
    },
    rules: {
      'react/jsx-no-useless-fragment': 'error',
      'react/prefer-read-only-props': 'error',
      'no-nested-ternary': 'error',
    },
    settings: {
      react: {
        version: '19.0.0',
      },
    },
  },

  // 6. Prettier errors mapping
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-unsafe-assignment': 'off',
      // Pre-existing <img> usages; prefer <Image /> in new code.
      '@next/next/no-img-element': 'warn',
    },
  },

  // 7. Prettier style overrides
  prettierConfig,
];

export default eslintConfig;

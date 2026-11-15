// Flat ESLint config (ESLint 9+) shared across the monorepo.
// Each app may extend this with framework-specific rules (React hooks, etc.)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    plugins: { import: importPlugin },
    languageOptions: {
      parserOptions: {
        project: [
          './apps/api/tsconfig.eslint.json',
          './apps/web/tsconfig.json',
          './packages/db/tsconfig.json',
          './packages/shared-types/tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Enterprise conventions: clean CI gates, strict types, ergonomic template literals and void returns
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false, arguments: false } },
      ],
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true, allowAny: false, allowNullish: true },
      ],
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'no-console': 'off',
      'import/order': 'off',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/*.config.js',
      '**/*.config.ts',
      '**/coverage/**',
      '**/.venv/**',
      '**/.pytest_cache/**',
      '**/__pycache__/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/apps/web/e2e/**',
      '**/scripts/**',
    ],
  },
);

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/**
 * Flat ESLint config for the whole workspace.
 *
 * Type-aware linting is deliberately off: `npm run typecheck` already runs the
 * compiler over every project, so duplicating that here would double CI time
 * for no extra signal.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'preview/**',
      '*.config.mjs',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Next.js rules (image usage, script usage, app-router pitfalls) apply only
  // to the web app.
  ...nextCoreWebVitals.map((entry) => ({
    ...entry,
    files: ['apps/web/**/*.{ts,tsx}'],
  })),

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Scripts and the seed are CLI tools; printing is the point.
  {
    files: ['scripts/**/*.ts', 'tests/**/*.ts'],
    rules: { 'no-console': 'off' },
  },

  // The worker's structured logger writes through console by design.
  {
    files: ['apps/voice-worker/src/logger.ts', 'apps/web/src/lib/logger.ts'],
    rules: { 'no-console': 'off' },
  },
);

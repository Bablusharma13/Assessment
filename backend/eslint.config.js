import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      // Only console.info and console.error are allowed (for server logs).
      'no-console': ['error', { allow: ['info', 'error'] }],
      // Allows unused params that start with "_" (e.g. `_next` in the error handler).
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];

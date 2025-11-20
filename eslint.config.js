import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

const legacyConfig = require('./.eslintrc.cjs');

export default [
  ...compat.config(legacyConfig),
  {
    ignores: ['dist', 'node_modules']
  }
];

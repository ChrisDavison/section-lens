import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig([
  { ignores: ['main.js', 'node_modules/**', 'tests/obsidian-smoke.js'] },
  ...obsidianmd.configs.recommended,
  { languageOptions: { parserOptions: { projectService: { allowDefaultProject: ['*.mjs', 'scripts/*.mjs'] } } } },
  // Development scripts run under Node, not in the mobile-compatible plugin.
  { files: ['*.mjs', 'scripts/*.mjs', 'tests/**/*.ts'], rules: {
    'obsidianmd/no-nodejs-modules': 'off',
    'obsidianmd/rule-custom-message': 'off',
  } },
  // The standalone deploy CLI has no running Vault; it accepts a config-directory argument.
  { files: ['deploy.mjs'], rules: { 'obsidianmd/hardcoded-config-path': 'off' } },
]);

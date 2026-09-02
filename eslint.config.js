// Svelte + Storybook only — JS/TS linting is handled by oxlint (see package.json `lint:ox`).
// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import { includeIgnoreFile } from '@eslint/compat';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import ts from 'typescript-eslint';
import { fileURLToPath } from 'node:url';
const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default [
	includeIgnoreFile(gitignorePath),
	{
		ignores: ['**/*.js', '**/*.ts', '**/*.mjs', '**/*.cjs']
	},
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	...storybook.configs['flat/recommended'],
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		rules: {
			// Most internal links use CMS paths, query strings, or `#`; full `resolve()` adoption is opt-in.
			'svelte/no-navigation-without-resolve': 'off',
			// Prefer keys on dynamic `{#each}`; enable when you want to enforce project-wide.
			'svelte/require-each-key': 'off',
			// Admin preview HTML is trusted server-provided content.
			'svelte/no-at-html-tags': 'off',
			'svelte/no-unused-svelte-ignore': 'off',
			// Lightbox and similar components intentionally pair $state with effects for open/index sync.
			'svelte/prefer-writable-derived': 'off'
		}
	}
];

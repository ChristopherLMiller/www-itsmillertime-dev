// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';
const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default ts.config(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte'],

		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	storybook.configs['flat/recommended'],
	{
		rules: {
			// Most internal links use CMS paths, query strings, or `#`; full `resolve()` adoption is opt-in.
			'svelte/no-navigation-without-resolve': 'off',
			// Prefer keys on dynamic `{#each}`; enable when you want to enforce project-wide.
			'svelte/require-each-key': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			// Admin preview HTML is trusted server-provided content.
			'svelte/no-at-html-tags': 'off',
			'svelte/no-unused-svelte-ignore': 'off',
			// Lightbox and similar components intentionally pair $state with effects for open/index sync.
			'svelte/prefer-writable-derived': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					args: 'after-used',
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_'
				}
			]
		}
	}
);

<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Lexical from './Lexical.svelte';
	import { sampleLexicalParagraph } from '../storybook/fixtures';

	const { Story } = defineMeta({
		title: 'Content/Lexical',
		component: Lexical,
		tags: ['autodocs']
	});
</script>

<Story name="Paragraph" args={{ data: sampleLexicalParagraph }} />

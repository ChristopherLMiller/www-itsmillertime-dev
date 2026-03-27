<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TimelineCard from './TimelineCard.svelte';
	import { sampleLexicalParagraph } from '../../storybook/fixtures';

	const { Story } = defineMeta({
		title: 'Components/TimelineCard',
		component: TimelineCard,
		tags: ['autodocs']
	});
</script>

<Story
	name="Default"
	args={{
		title: 'Milestone',
		content: sampleLexicalParagraph,
		isLast: false
	}}
/>

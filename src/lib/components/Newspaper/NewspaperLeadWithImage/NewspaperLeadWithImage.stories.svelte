<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import NewspaperLeadStoryShell from '../NewspaperLeadStoryShell/NewspaperLeadStoryShell.svelte';
	import NewspaperLeadWithImage from './NewspaperLeadWithImage.svelte';
	import { storybookImageMedia, storybookPost } from '../../../../storybook/fixtures';
	import type { Post } from '$lib/types/payload-types';

	const multiParagraphContent: Post['content'] = {
		root: {
			type: 'root',
			children: Array.from({ length: 6 }, (_, i) => ({
				type: 'paragraph' as const,
				children: [
					{
						type: 'text' as const,
						text:
							`Lead paragraph ${i + 1}. ` +
							'The lead body is capped by NEWSPAPER_LEAD_MAX_WORDS; multicol flows naturally. '.repeat(
								5
							)
					}
				],
				direction: 'ltr' as const,
				format: '' as const,
				indent: 0,
				version: 1
			})),
			direction: 'ltr' as const,
			format: '' as const,
			indent: 0,
			version: 1
		}
	};

	const longLeadPost: Post = {
		...storybookPost,
		slug: 'lead-with-image-story',
		title: 'City desk: lead with photograph',
		featuredImage: storybookImageMedia,
		content: multiParagraphContent,
		tags: storybookPost.tags
	};

	const { Story } = defineMeta({
		title: 'Components/Newspaper/NewspaperLeadWithImage',
		component: NewspaperLeadWithImage,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	<NewspaperLeadStoryShell>
		<NewspaperLeadWithImage article={longLeadPost} image={storybookImageMedia} />
	</NewspaperLeadStoryShell>
</Story>

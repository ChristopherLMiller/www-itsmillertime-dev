<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import NewspaperLeadStoryShell from '../NewspaperLeadStoryShell/NewspaperLeadStoryShell.svelte';
	import NewspaperLeadNoImage from './NewspaperLeadNoImage.svelte';
	import { storybookPost } from '../../../../storybook/fixtures';
	import type { Post } from '$lib/types/payload-types';

	const multiParagraphContent: Post['content'] = {
		root: {
			type: 'root',
			children: Array.from({ length: 8 }, (_, i) => ({
				type: 'paragraph' as const,
				children: [
					{
						type: 'text' as const,
						text:
							`Full-width lead paragraph ${i + 1}. ` +
							'Three columns on desktop; excerpt length is word-limited; “Continued on” when there is more to read. '.repeat(
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

	const longLeadNoImage: Post = {
		...storybookPost,
		slug: 'lead-no-image-story',
		title: 'Editorial: lead without art',
		featuredImage: null,
		content: multiParagraphContent,
		tags: storybookPost.tags
	};

	const { Story } = defineMeta({
		title: 'Components/Newspaper/NewspaperLeadNoImage',
		component: NewspaperLeadNoImage,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	<NewspaperLeadStoryShell>
		<NewspaperLeadNoImage article={longLeadNoImage} />
	</NewspaperLeadStoryShell>
</Story>

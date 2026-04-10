<script lang="ts">
	import type { Post, PostsCategory, PostsTag } from '$lib/types/payload-types';
	import NewspaperArticlesContent from './NewspaperArticlesContent.svelte';
	import NewspaperLayout from './NewspaperLayout.svelte';

	type Pagination = {
		page?: number;
		totalPages?: number;
		totalDocs?: number;
		limit?: number;
	};

	interface Props {
		title: string;
		subtitle: string;
		categories: PostsCategory[];
		selectedCategory: string;
		tags: PostsTag[];
		selectedTag: string;
		articles: Post[] | null;
		pagination: Pagination | null;
	}

	let {
		title,
		subtitle,
		categories,
		selectedCategory,
		tags,
		selectedTag,
		articles,
		pagination
	}: Props = $props();
</script>

<NewspaperLayout
	{title}
	{subtitle}
	subtitleTransitionName="newspaper-subtitle"
	{categories}
	{selectedCategory}
	{tags}
	{selectedTag}
	{pagination}
>
	<NewspaperArticlesContent {articles} />
</NewspaperLayout>

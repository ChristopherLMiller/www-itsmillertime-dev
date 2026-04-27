<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="newspaper-articles newspaper-lead-story-shell">
	{@render children()}
</div>

<style lang="postcss">
	/* Matches tokens from NewspaperArticlesContent so leads render correctly in Storybook. */
	.newspaper-lead-story-shell {
		--newspaper-body-lh: 1.45;
		--newspaper-title-lh: 1.22;
		--newspaper-meta-ls: 0.45px;
		--newspaper-section-heading-ls: 0.75px;
		--newspaper-multicol-gap: 1.35rem;
		--newspaper-tag-fs: calc(var(--fs-xs) * 0.85);
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
	}
</style>

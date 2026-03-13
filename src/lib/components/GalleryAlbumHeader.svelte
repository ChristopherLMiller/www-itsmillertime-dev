<script lang="ts">
	import Lexical from '$lib/Lexical.svelte';
	import type { GalleryAlbum, GalleryCategory, GalleryTag } from '$lib/types/payload-types';

	let { gallery, imageCount }: { gallery: GalleryAlbum; imageCount: number } = $props();

	const category = $derived(
		typeof gallery.settings?.category === 'object' && gallery.settings?.category !== null
			? (gallery.settings.category as GalleryCategory).title
			: null
	);

	const tags = $derived(
		(gallery.settings?.tags ?? [])
			.filter((t): t is GalleryTag => typeof t === 'object' && t !== null && 'title' in t)
			.map((t) => t.title)
	);

	const hasContent = $derived(!!gallery.content);
	const metaDescription = $derived(gallery.meta?.description ?? null);

	const dateFormatted = $derived.by(() => {
		const d = gallery.createdAt ? new Date(gallery.createdAt) : null;
		return d ? new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(d) : null;
	});
</script>

<div class="album-header">
	<div class="album-header__inner">
		{#if category}
			<div class="album-header__category">{category}</div>
		{/if}
		<h1 class="album-header__title">{gallery.title}</h1>
		{#if hasContent}
			<div class="album-header__description">
				<Lexical data={gallery.content!} />
			</div>
		{:else if metaDescription}
			<p class="album-header__description">{metaDescription}</p>
		{/if}

		<div class="album-header__meta">
			<div class="album-header__meta-item">
				<span class="album-header__meta-icon">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
						<circle cx="8.5" cy="8.5" r="1.5"></circle>
						<polyline points="21 15 16 10 5 21"></polyline>
					</svg>
				</span>
				<span class="album-header__meta-label">Photos</span>
				<span class="album-header__meta-value">{imageCount} {imageCount === 1 ? 'photo' : 'photos'}</span>
			</div>

			{#if dateFormatted}
				<div class="album-header__meta-item">
					<span class="album-header__meta-icon">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
							<line x1="16" y1="2" x2="16" y2="6"></line>
							<line x1="8" y1="2" x2="8" y2="6"></line>
							<line x1="3" y1="10" x2="21" y2="10"></line>
						</svg>
					</span>
					<span class="album-header__meta-label">Date</span>
					<span class="album-header__meta-value">{dateFormatted}</span>
				</div>
			{/if}

			{#if tags.length > 0}
				<div class="album-header__tags">
					{#each tags as tag}
						<span class="album-header__tag">{tag}</span>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.album-header__back {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-secondary);
		font-family: var(--font-special-elite);
		font-size: 1rem;
		text-decoration: none;
		margin-bottom: 2rem;
	}

	.album-header__back:hover {
		text-decoration: underline;
	}

	.album-header {
		max-width: 900px;
		margin: 0 auto 3rem auto;
		background: linear-gradient(145deg, #f5f0e6 0%, #e8e0d0 100%);
		padding: 2.5rem 3rem;
		position: relative;
		box-shadow:
			0 4px 20px rgba(0, 0, 0, 0.4),
			0 0 0 1px rgba(0, 0, 0, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.5);
	}

	.album-header::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
		opacity: 0.04;
		pointer-events: none;
	}

	.album-header::after {
		content: '';
		position: absolute;
		top: 12px;
		left: 12px;
		right: 12px;
		bottom: 12px;
		border: 2px solid rgba(139, 90, 43, 0.2);
		pointer-events: none;
	}

	.album-header__inner {
		position: relative;
		z-index: 1;
	}

	.album-header__category {
		display: inline-block;
		background: var(--color-primary-darker);
		color: var(--color-white-lightest);
		font-family: var(--font-special-elite);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 3px;
		padding: 0.4rem 1rem;
		margin-bottom: 1.25rem;
	}

	.album-header__title {
		color: #1a1a1a;
		font-family: var(--font-permanent-marker);
		font-size: 2.75rem;
		margin: 0 0 0.75rem 0;
		line-height: 1.2;
	}

	.album-header__description {
		color: #444;
		font-family: var(--font-special-elite);
		font-size: 1.1rem;
		line-height: 1.7;
		margin: 0 0 1.5rem 0;
		max-width: 700px;
	}

	.album-header__description :global(p) {
		margin: 0 0 0.5em 0;
	}

	.album-header__description :global(p:last-child) {
		margin-bottom: 0;
	}

	.album-header__meta {
		display: flex;
		flex-wrap: wrap;
		gap: 2rem;
		align-items: center;
		padding-top: 1.25rem;
		border-top: 1px solid rgba(0, 0, 0, 0.1);
	}

	.album-header__meta-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.album-header__meta-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.album-header__meta-icon svg {
		color: var(--color-primary-darker);
		display: block;
	}

	.album-header__meta-label {
		color: #888;
		font-family: var(--font-special-elite);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.album-header__meta-value {
		color: #333;
		font-family: var(--font-special-elite);
		font-size: 0.95rem;
	}

	.album-header__tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-left: auto;
	}

	.album-header__tag {
		background: rgba(0, 0, 0, 0.05);
		border: 1px solid rgba(0, 0, 0, 0.1);
		color: #555;
		font-family: var(--font-special-elite);
		font-size: 0.75rem;
		padding: 0.3rem 0.75rem;
	}

	@media (max-width: 768px) {
		.album-header {
			padding: 1.5rem 1.5rem;
		}

		.album-header__title {
			font-size: 2rem;
		}
	}
</style>

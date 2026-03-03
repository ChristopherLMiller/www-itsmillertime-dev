<script lang="ts">
	import Image from './Image.svelte';
	import type { Media } from '../types/payload-types';
	import type { GalleryCategory, GalleryTag } from '../types/payload-types';

	type PolaroidProps = {
		media: Media;
		caption?: string;
		className?: string;
		interactive?: boolean;
		enableViewTransition?: boolean;
		hoverFlip?: boolean;
		albumTitle?: string;
		albumDescription?: string;
		useProxy?: boolean;
		isNsfw?: boolean;
		adaptiveHeight?: boolean;
		imageCount?: number;
		category?: GalleryCategory | null;
		tags?: (GalleryTag | number)[] | null;
		onNavigate?: () => void;
		onCategoryClick?: (slug: string) => void;
		onTagClick?: (slug: string) => void;
	};

	const {
		media,
		caption,
		className = '',
		interactive = true,
		enableViewTransition = false,
		hoverFlip = false,
		albumTitle,
		albumDescription,
		useProxy = false,
		isNsfw = false,
		adaptiveHeight = false,
		imageCount,
		category,
		tags = [],
		onNavigate,
		onCategoryClick,
		onTagClick
	}: PolaroidProps = $props();

	const displayCaption = $derived(caption ?? media?.alt ?? '');

	let isFlipped = $state(false);
	let isHovering = $state(false);

	const resolvedCategory = $derived(
		typeof category === 'object' && category !== null && 'slug' in category ? category : null
	);
	const resolvedTags = $derived(
		(tags ?? []).filter((t): t is GalleryTag => typeof t === 'object' && t !== null && 'slug' in t)
	);

	function handleMainClick(e: MouseEvent) {
		if ((e.target as HTMLElement).closest('a.polaroid__description-link')) return;
		onNavigate?.();
	}

	function handleMainKeydown(e: KeyboardEvent) {
		if ((e.target as HTMLElement).closest('a.polaroid__description-link')) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onNavigate?.();
		}
	}

	function handleCategoryClick(e: MouseEvent, slug: string) {
		e.preventDefault();
		e.stopPropagation();
		onCategoryClick?.(slug);
	}

	function handleTagClick(e: MouseEvent, slug: string) {
		e.preventDefault();
		e.stopPropagation();
		onTagClick?.(slug);
	}

	function toggleFlip() {
		if (!interactive) return;
		isFlipped = !isFlipped;
	}

	function handleMouseEnter() {
		if (hoverFlip) {
			isHovering = true;
		}
	}

	function handleMouseLeave() {
		if (hoverFlip) {
			isHovering = false;
		}
	}

	const shouldBeFlipped = $derived(hoverFlip ? isHovering : isFlipped);
	const imageRatio = $derived(
		media?.width && media?.height ? media.height / media.width : 1.2
	);
</script>

{#if interactive}
	<!-- Use div when we have filter chips (onNavigate) to avoid invalid nested buttons -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<svelte:element
		this={onNavigate ? 'div' : 'button'}
		class="polaroid {className} {shouldBeFlipped ? 'flipped' : ''}"
		role={onNavigate ? 'button' : undefined}
		tabindex={onNavigate ? 0 : undefined}
		type={onNavigate ? undefined : 'button'}
		aria-pressed={shouldBeFlipped}
		aria-label={onNavigate && albumTitle ? `View gallery: ${albumTitle}` : undefined}
		onclick={onNavigate ? handleMainClick : toggleFlip}
		onkeydown={onNavigate ? handleMainKeydown : undefined}
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
	>
		<div class="polaroid__inner" style:padding-top={adaptiveHeight ? `calc(${imageRatio * 100}% + 3.5rem)` : undefined}>
			<div class="polaroid__face polaroid__face--front">
				<div class="polaroid__image-wrapper">
					<Image
						image={media}
						transitionName={enableViewTransition ? `gallery-image-${media.id}` : undefined}
						className="polaroid__image-component"
						objectFit="cover"
						{useProxy}
						{isNsfw}
					/>
				</div>
				{#if displayCaption}
					<div class="polaroid__caption">{displayCaption}</div>
				{/if}
			</div>

			<div class="polaroid__face polaroid__face--back">
				{#if albumTitle || albumDescription || imageCount != null || resolvedCategory || resolvedTags.length > 0}
					<div class="polaroid__back-content">
						{#if albumTitle}
							<h3 class="polaroid__album-title">{albumTitle}</h3>
						{/if}
						{#if albumDescription || imageCount != null || resolvedCategory}
							<hr class="polaroid__hr" />
							<p class="polaroid__album-description">
								{#if albumDescription}{albumDescription}{/if}
								{#if imageCount != null}
									{albumDescription ? ' · ' : ''}{imageCount} {imageCount === 1 ? 'photo' : 'photos'}
								{/if}
								{#if resolvedCategory?.slug && resolvedCategory?.title}
									{#if onCategoryClick}
										<a
											href="#"
											class="polaroid__description-link"
											onclick={(e) => handleCategoryClick(e, resolvedCategory.slug!)}
										>
											{(albumDescription || imageCount != null) ? ' · ' : ''}{resolvedCategory.title}
										</a>
									{:else}
										{(albumDescription || imageCount != null) ? ' · ' : ''}{resolvedCategory.title}
									{/if}
								{/if}
							</p>
						{/if}
						{#if resolvedTags.length > 0}
							<hr class="polaroid__hr" />
							<p class="polaroid__tags">
								{#each resolvedTags as tag, index (tag.id)}
									{#if tag.slug && tag.title}
										{#if onTagClick}
											<a
												href="#"
												class="polaroid__description-link"
												onclick={(e) => handleTagClick(e, tag.slug!)}
											>
												{index > 0 ? ', ' : ''}{tag.title}
											</a>
										{:else}
											{index > 0 ? ', ' : ''}{tag.title}
										{/if}
									{/if}
								{/each}
							</p>
						{/if}
					</div>
				{:else}
					<p class="polaroid__note">
						{caption}
					</p>
				{/if}
			</div>
		</div>
	</svelte:element>
{:else}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="polaroid {className} polaroid--static {shouldBeFlipped ? 'flipped' : ''}"
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
	>
		<div class="polaroid__inner" style:padding-top={adaptiveHeight ? `calc(${imageRatio * 100}% + 3.5rem)` : undefined}>
			<div class="polaroid__face polaroid__face--front">
				<div class="polaroid__image-wrapper">
					<Image
						image={media}
						transitionName={enableViewTransition ? `gallery-image-${media.id}` : undefined}
						className="polaroid__image-component"
						objectFit="cover"
						{useProxy}
						{isNsfw}
					/>
				</div>
				{#if displayCaption}
					<div class="polaroid__caption">{displayCaption}</div>
				{/if}
			</div>

			<div class="polaroid__face polaroid__face--back">
				{#if albumTitle || albumDescription}
					<div class="polaroid__back-content">
						{#if albumTitle}
							<h3 class="polaroid__album-title">{albumTitle}</h3>
						{/if}
						{#if albumDescription}
							<p class="polaroid__album-description">{albumDescription}</p>
						{/if}
					</div>
				{:else}
					<p class="polaroid__note">
						{caption}
					</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	:global(:root) {
		--polaroid-background: #fefdf8;
		--polaroid-border: #f0ede3;
		--polaroid-shadow: rgba(0, 0, 0, 0.2);
	}

	.polaroid {
		position: relative;
		width: min(18rem, 90vw);
		background: transparent;
		border: 0;
		padding: 0;
		perspective: 1200px;
		cursor: pointer;
		transition: transform 250ms ease, box-shadow 250ms ease;
		transform-origin: center;
	}

	.polaroid:hover,
	.polaroid:focus-visible {
		transform: translateY(-0.5rem) scale(1.03);
		box-shadow: 0.75rem 1.5rem 2.5rem -1rem var(--polaroid-shadow);
	}

	.polaroid--static {
		cursor: default;
	}

	.polaroid--static:hover,
	.polaroid--static:focus-visible {
		transform: none;
		box-shadow: 0.35rem 0.8rem 1.5rem -0.8rem var(--polaroid-shadow);
	}

	.polaroid__inner {
		position: relative;
		width: 100%;
		padding-top: 120%;
		transform-style: preserve-3d;
		transition: transform 450ms ease;
	}

	.polaroid.flipped .polaroid__inner {
		transform: rotateY(180deg);
	}

	.polaroid__face {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		background: var(--polaroid-background);
		border: 2px solid var(--polaroid-border);
		border-radius: 8px;
		padding: 1rem 1rem 2.5rem;
		box-shadow: 0 0.75rem 1.5rem -1rem var(--polaroid-shadow);
		backface-visibility: hidden;
	}

	.polaroid__face--back {
		transform: rotateY(180deg);
		align-items: center;
		text-align: center;
		padding: 2rem;
	}

	.polaroid__image-wrapper {
		position: relative;
		flex: 1;
		overflow: hidden;
		background: #dcd8cf;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.polaroid__image-wrapper :global(.polaroid__image-component) {
		width: 100%;
		height: 100%;
		border-radius: 6px;
	}

	.polaroid__hr {
		border: none;
		border-top: 1px solid var(--polaroid-border);
		margin: 0.75rem 0;
	}

	.polaroid__description-link {
		color: inherit;
		text-decoration: none;
		cursor: pointer;
	}

	.polaroid__description-link:hover {
		text-decoration: underline;
	}

	.polaroid__caption {
		margin-top: 1.25rem;
		text-align: center;
		font-family: 'Permanent Marker', cursive;
		font-size: 1.1rem;
		color: #2f2b25;
		letter-spacing: 0.04em;
	}

	.polaroid__note {
		font-size: 0.95rem;
		line-height: 1.5;
		color: #4a4a47;
	}

	.polaroid__back-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		text-align: center;
	}

	.polaroid__album-title {
		font-family: 'Permanent Marker', cursive;
		font-size: 1.25rem;
		color: #2f2b25;
		margin: 0;
		letter-spacing: 0.04em;
	}

	.polaroid__album-description {
		font-family: 'Permanent Marker', cursive;
		font-size: 0.9rem;
		line-height: 1.6;
		color: #4a4a47;
		margin: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.polaroid,
		.polaroid__inner {
			transition: none;
		}
	}
</style>


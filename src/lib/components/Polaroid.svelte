<script lang="ts">
	import Image from './Image.svelte';
	import GalleryMediaPlayer from './GalleryMediaPlayer.svelte';
	import { isVideoMedia } from '../utils/media-url';
	import type { Media } from '../types/payload-types';

	type PolaroidProps = {
		media: Media;
		caption?: string;
		className?: string;
		interactive?: boolean;
		/** When true, show pointer cursor (e.g. when parent opens lightbox) */
		clickable?: boolean;
		enableViewTransition?: boolean;
		hoverFlip?: boolean;
		albumTitle?: string;
		albumDescription?: string;
		useProxy?: boolean;
		isNsfw?: boolean;
		adaptiveHeight?: boolean;
		/** When set, use fixed polaroid aspect ratio instead of image dimensions (image uses cover) */
		fixedAspectRatio?: number;
		/** When set, overrides the flip state (e.g. when stack is expanded on touch) */
		flipped?: boolean;
		onNavigate?: () => void;
		/** When true, image loads eagerly (for above-the-fold) */
		priority?: boolean;
	};

	const {
		media,
		caption,
		className = '',
		interactive = true,
		clickable = false,
		enableViewTransition = false,
		hoverFlip = false,
		albumTitle,
		albumDescription,
		useProxy = false,
		isNsfw = false,
		adaptiveHeight = false,
		fixedAspectRatio,
		flipped,
		onNavigate,
		priority = false
	}: PolaroidProps = $props();

	const displayCaption = $derived(caption ?? '');
	const isVideo = $derived(isVideoMedia(media));

	let isFlipped = $state(false);
	let isHovering = $state(false);

	function handleMainClick(e: MouseEvent) {
		onNavigate?.();
	}

	function handleMainKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onNavigate?.();
		}
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

	const shouldBeFlipped = $derived(flipped ?? (hoverFlip ? isHovering : isFlipped));
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
		<div class="polaroid__inner">
			<div class="polaroid__face polaroid__face--front">
				<div class="polaroid__card">
					{#if isVideo}
						<GalleryMediaPlayer media={media} {useProxy} className="polaroid__image" />
					{:else}
						<Image
							image={media}
							transitionName={enableViewTransition ? `gallery-image-${media.id}` : undefined}
							className="polaroid__image"
							objectFit={adaptiveHeight ? 'contain' : 'cover'}
							fixedAspectRatio={fixedAspectRatio}
							cursorPointer={!!onNavigate}
							{useProxy}
							{isNsfw}
							{priority}
						/>
					{/if}
					<div class="polaroid__caption"><p>{displayCaption}</p></div>
				</div>
			</div>

			<div class="polaroid__face polaroid__face--back">
				<div class="polaroid__card polaroid__card--back">
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
						<p class="polaroid__note">{caption}</p>
					{/if}
				</div>
			</div>
		</div>
	</svelte:element>
{:else}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="polaroid {className} polaroid--static {clickable ? 'polaroid--clickable' : ''} {shouldBeFlipped ? 'flipped' : ''}"
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
	>
		<div class="polaroid__inner">
			<div class="polaroid__face polaroid__face--front">
				<div class="polaroid__card">
					{#if isVideo}
						<GalleryMediaPlayer media={media} {useProxy} className="polaroid__image" />
					{:else}
						<Image
							image={media}
							transitionName={enableViewTransition ? `gallery-image-${media.id}` : undefined}
							className="polaroid__image"
							objectFit={adaptiveHeight ? 'contain' : 'cover'}
							fixedAspectRatio={fixedAspectRatio}
							cursorPointer={clickable}
							{useProxy}
							{isNsfw}
							{priority}
						/>
					{/if}
					<div class="polaroid__caption"><p>{displayCaption}</p></div>
				</div>
			</div>

			<div class="polaroid__face polaroid__face--back">
				<div class="polaroid__card polaroid__card--back">
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
						<p class="polaroid__note">{caption}</p>
					{/if}
				</div>
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

	.polaroid--clickable {
		cursor: pointer;
	}

	.polaroid--static:hover,
	.polaroid--static:focus-visible {
		transform: none;
		box-shadow: 0.35rem 0.8rem 1.5rem -0.8rem var(--polaroid-shadow);
	}

	.polaroid__inner {
		position: relative;
		width: 100%;
		transform-style: preserve-3d;
		transition: transform 450ms ease;
	}

	.polaroid.flipped .polaroid__inner {
		transform: rotateY(180deg);
	}

	.polaroid__face {
		backface-visibility: hidden;
	}


	.polaroid__face--back {
		position: absolute;
		inset: 0;
		transform: rotateY(180deg);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.polaroid__card {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		background: var(--polaroid-background);
		border: 2px solid var(--polaroid-border);
		border-radius: 8px;
		padding: 1rem 1rem 2.5rem;
		box-shadow: 0 0.75rem 1.5rem -1rem var(--polaroid-shadow);
	}

	.polaroid__card--back {
		width: 100%;
		height: 100%;
		justify-content: center;
		text-align: center;
		padding: 1rem;
		overflow: auto;
	}

	.polaroid__face--front .polaroid__card {
		overflow: hidden;
		min-width: 0;
	}

	.polaroid__card :global(.polaroid__image) {
		width: 100%;
		border-radius: 6px;
		background: #dcd8cf;
	}

	.polaroid__hr {
		border: none;
		border-top: 1px solid var(--polaroid-border);
		margin: 0.5rem 0;
	}

	.polaroid__caption {
		text-align: center;
		font-family: 'Permanent Marker', cursive;
		font-size: 1.1rem;
		color: #2f2b25;
		letter-spacing: 0.04em;
		min-height: 1.5em;
		/* Single-line clamp with ellipsis (modern CSS) */
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
		min-width: 0;
	}

	.polaroid__note {
		font-family: var(--font-permanent-marker), cursive;
		font-size: var(--fs-xs);
		line-height: 1.4;
		color: #4a4a47;
		margin: 0;
		overflow-wrap: break-word;
	}

	.polaroid__back-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		text-align: center;
		min-height: 0;
	}

	.polaroid__album-title {
		font-family: var(--font-permanent-marker), cursive;
		font-size: var(--fs-base);
		color: #2f2b25;
		margin: 0;
		letter-spacing: 0.04em;
	}

	.polaroid__album-description {
		font-family: var(--font-crimson-text);
		font-style: italic;
		font-size: var(--fs-xs);
		line-height: 1.5;
		color: #4a4a47;
		margin: 0;
		overflow-wrap: break-word;
	}

	@media (prefers-reduced-motion: reduce) {
		.polaroid,
		.polaroid__inner {
			transition: none;
		}
	}
</style>

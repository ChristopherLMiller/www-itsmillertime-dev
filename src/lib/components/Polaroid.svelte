<script lang="ts">
	import Image from './Image.svelte';
	import type { Media } from '../types/payload-types';

	type PolaroidProps = {
		media: Media;
		caption?: string;
		className?: string;
		interactive?: boolean;
		enableViewTransition?: boolean;
		hoverFlip?: boolean;
		albumTitle?: string;
		albumDescription?: string;
	};

	const {
		media,
		caption,
		className = '',
		interactive = true,
		enableViewTransition = false,
		hoverFlip = false,
		albumTitle,
		albumDescription
	}: PolaroidProps = $props();

	const displayCaption = $derived(caption ?? media?.alt ?? '');

	let isFlipped = $state(false);
	let isHovering = $state(false);

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
</script>

{#if interactive}
	<button
		type="button"
		class="polaroid {className} {shouldBeFlipped ? 'flipped' : ''}"
		aria-pressed={shouldBeFlipped}
		onclick={toggleFlip}
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
	>
		<div class="polaroid__inner">
			<div class="polaroid__face polaroid__face--front">
				<div class="polaroid__image-wrapper">
					<Image
						image={media}
						transitionName={enableViewTransition ? `gallery-image-${media.id}` : undefined}
						className="polaroid__image-component"
						objectFit="cover"
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
	</button>
{:else}
	<div
		class="polaroid {className} polaroid--static {shouldBeFlipped ? 'flipped' : ''}"
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
	>
		<div class="polaroid__inner">
			<div class="polaroid__face polaroid__face--front">
				<div class="polaroid__image-wrapper">
					<Image
						image={media}
						transitionName={enableViewTransition ? `gallery-image-${media.id}` : undefined}
						className="polaroid__image-component"
						objectFit="cover"
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


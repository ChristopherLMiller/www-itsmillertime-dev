<script lang="ts">
	import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
	import type { Media } from '../types/payload-types';

	type PolaroidProps = {
		media: Media;
		caption?: string;
		className?: string;
		interactive?: boolean;
		enableViewTransition?: boolean;
	};

	const {
		media,
		caption,
		className = '',
		interactive = true,
		enableViewTransition = false
	}: PolaroidProps = $props();

	const displayCaption = $derived(caption ?? media?.alt ?? '');

	let isFlipped = $state(false);
	let isLoaded = $state(false);

	const imageSrc = $derived(
		media?.sizes?.xlarge?.url ??
			media?.sizes?.large?.url ??
			media?.sizes?.medium?.url ??
			media?.sizes?.small?.url ??
			media?.url ??
			null
	);

	const placeholderSrc = $derived(media?.blurhash ?? null);

	function toggleFlip() {
		if (!interactive) return;
		isFlipped = !isFlipped;
	}
</script>

{#if interactive}
	<button
		type="button"
		class="polaroid {className} {isFlipped ? 'flipped' : ''}"
		aria-pressed={isFlipped}
		onclick={toggleFlip}
	>
		<div class="polaroid__inner">
			<div class="polaroid__face polaroid__face--front">
				<div class="polaroid__image-wrapper">
					{#if placeholderSrc}
						<img
							class="polaroid__image polaroid__image--placeholder"
							src={placeholderSrc}
							alt="Loading placeholder"
							aria-hidden="true"
							style:opacity={isLoaded ? 0 : 1}
						/>
					{/if}

					{#if imageSrc}
						<img
							class="polaroid__image polaroid__image--main"
							src={`${PUBLIC_PAYLOAD_URL}${imageSrc}`}
							alt={media?.alt ?? ''}
							loading="lazy"
							style:opacity={isLoaded ? 1 : 0}
							style:view-transition-name={enableViewTransition ? `gallery-image-${media.id}` : undefined}
							onload={() => (isLoaded = true)}
						/>
					{/if}
				</div>
				{#if displayCaption}
					<div class="polaroid__caption">{displayCaption}</div>
				{/if}
			</div>

			<div class="polaroid__face polaroid__face--back">
				<p class="polaroid__note">
					Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus
					tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.
				</p>
			</div>
		</div>
	</button>
{:else}
	<div class="polaroid {className} polaroid--static">
		<div class="polaroid__inner">
			<div class="polaroid__face polaroid__face--front">
				<div class="polaroid__image-wrapper">
					{#if placeholderSrc}
						<img
							class="polaroid__image polaroid__image--placeholder"
							src={placeholderSrc}
							alt="Loading placeholder"
							aria-hidden="true"
							style:opacity={isLoaded ? 0 : 1}
						/>
					{/if}

					{#if imageSrc}
						<img
							class="polaroid__image polaroid__image--main"
							src={`${PUBLIC_PAYLOAD_URL}${imageSrc}`}
							alt={media?.alt ?? ''}
							loading="lazy"
							style:opacity={isLoaded ? 1 : 0}
							style:view-transition-name={enableViewTransition ? `gallery-image-${media.id}` : undefined}
							onload={() => (isLoaded = true)}
						/>
					{/if}
				</div>
				{#if displayCaption}
					<div class="polaroid__caption">{displayCaption}</div>
				{/if}
			</div>

			<div class="polaroid__face polaroid__face--back">
				<p class="polaroid__note">
					Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus
					tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.
				</p>
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

	.polaroid__image {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: opacity 300ms ease;
	}

	.polaroid__image--placeholder {
		filter: blur(8px);
		transform: scale(1.05);
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

	@media (prefers-reduced-motion: reduce) {
		.polaroid,
		.polaroid__inner {
			transition: none;
		}
	}
</style>


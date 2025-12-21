<script lang="ts">
	import Polaroid from './Polaroid.svelte';
	import type { Media } from '../types/payload-types';

	type PolaroidStackProps = {
		primary: Media;
		images?: Media[];
		caption?: string;
		className?: string;
		maxStack?: number;
	};

	const {
		primary,
		images = [],
		caption,
		className = '',
		maxStack = 6
	}: PolaroidStackProps = $props();

	const initialViewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
	const initialViewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

	let container: HTMLDivElement | null = $state(null);
	let viewportWidth = $state(initialViewportWidth);
	let viewportHeight = $state(initialViewportHeight);

	function isMedia(value: unknown): value is Media {
		return typeof value === 'object' && value !== null && 'id' in value;
	}

	const secondaryMedia = $derived(
		images
			.filter((value): value is Media => isMedia(value))
			.filter((media) => media.id !== primary.id)
			.slice(0, Math.max(0, maxStack - 1))
	);

	const stackMedias = $derived([primary, ...secondaryMedia]);

	const stackLayout = $derived(
		stackMedias.map((media, index, array) => {
			const total = array.length;
			const isPrimary = index === 0;
			const offset = isPrimary ? 0 : index - (total - 1) / 2;
			const depth = total - index - 1;
			const randomSeed = (media.id ?? index) * 97.371;
			const jitter = (Math.sin(randomSeed) + 1) / 2;
			const baseSpread = 48 + total * 4;

			let translateX = isPrimary ? 0 : offset * baseSpread;
			let translateY = isPrimary ? 0 : depth * 26 + 32 + Math.abs(offset) * 14;
			const rotate = isPrimary ? 0 : offset * 7 + (jitter - 0.5) * 15;

			if (!isPrimary && container) {
				const rect = container.getBoundingClientRect();
				const reservedEdge = 64;
				const width = rect.width;
				const height = rect.height;
				const futureLeft = rect.left + translateX;
				const futureRight = rect.left + translateX + width;
				const futureTop = rect.top + translateY;
				const futureBottom = rect.top + translateY + height;

				if (futureLeft < reservedEdge) {
					translateX += reservedEdge - futureLeft;
				}
				if (futureRight > viewportWidth - reservedEdge) {
					translateX -= futureRight - (viewportWidth - reservedEdge);
				}
				if (futureTop < reservedEdge) {
					translateY += reservedEdge - futureTop;
				}
				if (futureBottom > viewportHeight - reservedEdge) {
					translateY -= futureBottom - (viewportHeight - reservedEdge);
				}
			}

			return {
				key: `${media.id ?? 'media'}-${index}`,
				media,
				translateX,
				translateY,
				rotate,
				zIndex: array.length - index,
				isPrimary,
				caption: isPrimary ? caption ?? media.alt ?? '' : media.alt ?? ''
			};
		})
	);

	$effect(() => {
		if (typeof window === 'undefined') return;

		const updateViewport = () => {
			viewportWidth = window.innerWidth;
			viewportHeight = window.innerHeight;
		};

		updateViewport();
		window.addEventListener('resize', updateViewport);

		return () => {
			window.removeEventListener('resize', updateViewport);
		};
	});
</script>

<div bind:this={container} class="polaroid-stack {className}">
	{#each stackLayout as item (item.key)}
		<div
			class="polaroid-stack__item {item.isPrimary ? 'polaroid-stack__item--primary' : ''}"
			style={`z-index: ${item.zIndex}; --target-translate-x: ${item.translateX}px; --target-translate-y: ${item.translateY}px; --target-rotate: ${item.rotate}deg;`}
		>
			<Polaroid
				media={item.media}
				caption={item.caption}
				interactive={item.isPrimary}
				className="polaroid-stack__polaroid"
			/>
		</div>
	{/each}
</div>

<style>
	.polaroid-stack {
		position: relative;
		display: inline-block;
		width: min(18rem, 90vw);
		margin: 0;
		z-index: 0;
	}

	.polaroid-stack:hover,
	.polaroid-stack:focus-within {
		z-index: 50;
	}

	.polaroid-stack__item {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		pointer-events: none;
		transform-origin: center;
		--target-translate-x: 0px;
		--target-translate-y: 0px;
		--target-rotate: 0deg;
		--translate-x: 0px;
		--translate-y: 0px;
		--rotate: 0deg;
		transform: translate3d(var(--translate-x), var(--translate-y), 0) rotate(var(--rotate));
		transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), z-index 200ms ease;
	}

	.polaroid-stack:hover .polaroid-stack__item:not(.polaroid-stack__item--primary) {
		--translate-x: var(--target-translate-x);
		--translate-y: var(--target-translate-y);
		--rotate: var(--target-rotate);
	}

	.polaroid-stack__item--primary {
		position: relative;
		pointer-events: auto;
		transform: none;
	}

	.polaroid-stack__item--primary ~ .polaroid-stack__item {
		pointer-events: none;
	}

	:global(.polaroid-stack__polaroid.polaroid) {
		width: 100%;
	}
</style>


<script lang="ts">
	import { scrollY } from 'svelte/reactivity/window';
	import { watchFooterVersionBar } from '$lib/utils/footer-version-bar';

	/** Start fading in after this many pixels scrolled. */
	const FADE_START = 240;
	/** Fully opaque after this many additional pixels. */
	const FADE_RANGE = 320;

	const progress = $derived.by(() => {
		const y = scrollY.current ?? 0;
		if (y <= FADE_START) return 0;
		return Math.min(1, (y - FADE_START) / FADE_RANGE);
	});

	const interactive = $derived(progress > 0.05);

	$effect(() => watchFooterVersionBar());

	function scrollToTop() {
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
	}
</script>

<button
	type="button"
	class="scroll-to-top"
	style:opacity={progress}
	style:pointer-events={interactive ? 'auto' : 'none'}
	tabindex={interactive ? 0 : -1}
	aria-hidden={!interactive}
	aria-label="Scroll to top"
	onclick={scrollToTop}
>
	<svg
		class="scroll-to-top__arrow"
		viewBox="0 0 24 24"
		fill="none"
		aria-hidden="true"
		focusable="false"
	>
		<path d="M5 15.5 12 8.5l7 7" />
	</svg>
</button>

<style lang="postcss">
	.scroll-to-top {
		--scroll-to-top-inset: calc(var(--chrome-corner-gap) + env(safe-area-inset-right, 0px));

		position: fixed;
		right: var(--scroll-to-top-inset);
		bottom: var(--chrome-corner-bottom);
		z-index: 9990;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		margin: 0;
		padding: 0;
		border: none;
		border-radius: 0;
		background: var(--color-primary);
		color: var(--color-white-lightest);
		box-shadow: var(--box-shadow-elev-1);
		cursor: pointer;
		transition:
			right 180ms ease,
			bottom 180ms ease,
			background 150ms ease,
			opacity 180ms ease;
	}

	.scroll-to-top:hover {
		background: var(--color-primary-darker);
	}

	.scroll-to-top:focus-visible {
		outline: 2px solid var(--color-secondary);
		outline-offset: 2px;
	}

	.scroll-to-top__arrow {
		display: block;
		width: 1.35rem;
		height: 1.35rem;
		stroke: currentColor;
		stroke-width: 3.25;
		stroke-linecap: square;
		stroke-linejoin: miter;
	}

	@media (prefers-reduced-motion: reduce) {
		.scroll-to-top {
			transition:
				background 150ms ease,
				opacity 180ms ease;
		}
	}
</style>

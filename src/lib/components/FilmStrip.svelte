<script lang="ts">
	type CategoryItem = { id: number; slug?: string | null; title: string };

	type FilmStripProps = {
		categories: CategoryItem[];
		selectedSlug: string;
		getHref: (slug: string) => string;
	};

	let { categories, selectedSlug, getHref }: FilmStripProps = $props();

	let framesEl: HTMLDivElement | undefined = $state();
	let frameRefs: Record<number, HTMLAnchorElement | null> = $state({});

	let indicatorLeft = $state(0);
	let indicatorWidth = $state(0);

	const items = $derived([
		{ slug: '', title: 'All' },
		...categories.map((c) => ({ slug: c.slug ?? '', title: c.title }))
	]);

	const selectedIndex = $derived(
		items.findIndex((item) => item.slug === selectedSlug)
	);

	function frameRefAction(node: HTMLAnchorElement, index: number) {
		frameRefs = { ...frameRefs, [index]: node };
		return {
			destroy() {
				frameRefs = { ...frameRefs, [index]: null };
			}
		};
	}

	function updateIndicatorPosition() {
		const idx = selectedIndex >= 0 ? selectedIndex : 0;
		const frame = frameRefs[idx];
		if (frame && frame.offsetParent) {
			indicatorLeft = frame.offsetLeft;
			indicatorWidth = frame.offsetWidth;
		}
	}

	$effect(() => {
		updateIndicatorPosition();
	});

	$effect(() => {
		const container = framesEl;
		if (!container) return;
		const ro = new ResizeObserver(updateIndicatorPosition);
		ro.observe(container);
		return () => ro.disconnect();
	});

	$effect(() => {
		const idx = Math.max(0, selectedIndex);
		const frame = frameRefs[idx];
		const container = framesEl;
		if (frame && container) {
			frame.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
		}
	});
</script>

<div class="film-strip">
	<div class="film-strip__sprockets film-strip__sprockets--top" aria-hidden="true"></div>

	<div class="film-strip__track">
		<div class="film-strip__frames" bind:this={framesEl}>
			<div
				class="film-strip__indicator"
				style="left: {indicatorLeft}px; width: {indicatorWidth}px;"
				aria-hidden="true"
			></div>
			{#each items as item, i (item.slug || item.title)}
				<a
					href={getHref(item.slug)}
					class="film-strip__frame"
					class:film-strip__frame--selected={item.slug === selectedSlug}
					use:frameRefAction={i}
				>
					<span class="film-strip__frame-label">{item.title}</span>
				</a>
			{/each}
		</div>
	</div>

	<div class="film-strip__sprockets film-strip__sprockets--bottom" aria-hidden="true"></div>
</div>

<style lang="postcss">
	.film-strip {
		--film-bg: #1a1a1a;
		--film-frame-bg: #2d2d2d;
		--film-frame-selected: var(--color-primary);
		--sprocket-color: #0d0d0d;
		--frame-gap: 4px;

		display: flex;
		flex-direction: column;
		align-items: center;
		background: var(--film-bg);
		padding: 0.5rem 1rem;
		border-radius: 4px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
		max-width: 100%;
		overflow: hidden;
	}

	.film-strip__sprockets {
		width: 100%;
		height: 10px;
		margin: 4px 0;
		background-image: linear-gradient(
			to right,
			var(--sprocket-color) 0 8px,
			transparent 8px 20px
		);
		background-repeat: repeat-x;
		background-size: 20px 100%;
		background-position: center;
	}

	.film-strip__track {
		position: relative;
		width: 100%;
		min-height: 4rem;
	}

	.film-strip__indicator {
		position: absolute;
		top: 0;
		height: 100%;
		border: 2px solid var(--film-frame-selected);
		border-radius: 2px;
		pointer-events: none;
		transition: left 0.3s ease, width 0.3s ease;
		z-index: 1;
	}

	.film-strip__frames {
		display: flex;
		gap: var(--frame-gap);
		justify-content: center;
		flex-wrap: nowrap;
		overflow-x: auto;
		padding: 0.5rem 0;
		position: relative;
		z-index: 0;
		scrollbar-width: none;
	}

	.film-strip__frames::-webkit-scrollbar {
		display: none;
	}

	.film-strip__frame {
		flex-shrink: 0;
		width: auto;
		min-height: 3rem;
		padding: 0.25rem 0.5rem;
		background: var(--film-frame-bg);
		border: 2px solid transparent;
		border-radius: 2px;
		color: var(--color-white-lightest);
		font-family: var(--font-permanent-marker), cursive;
		font-size: var(--fs-xs);
		cursor: pointer;
		transition: background 0.2s, border-color 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		text-decoration: none;

		&:hover {
			background: #3d3d3d;
		}

		&:focus-visible {
			outline: 2px solid var(--color-primary);
			outline-offset: 2px;
		}
	}

	.film-strip__frame-label {
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.film-strip__indicator {
			transition: none;
		}
	}
</style>

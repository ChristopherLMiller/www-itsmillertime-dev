<script lang="ts">
	import { PUBLIC_PAYLOAD_API_ENDPOINT } from '$env/static/public';
	import { onMount, tick } from 'svelte';

	const nowPlayingUrl = `${PUBLIC_PAYLOAD_API_ENDPOINT.replace(/\/$/, '')}/lastfm/now-playing`;

	type NowPlayingTrack = {
		name: string;
		artist: string;
		album: string | null;
		url: string;
		image: string | null;
	};

	type NowPlayingResponse = {
		isPlaying: boolean;
		track: NowPlayingTrack | null;
	};

	type NowPlayingWidgetProps = {
		refreshIntervalMs?: number;
		position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
		className?: string;
		showWhenIdle?: boolean;
		idleLabel?: string;
	};

	const {
		refreshIntervalMs = 20000,
		position = 'bottom-right',
		className = '',
		showWhenIdle = false,
		idleLabel = 'Last played'
	}: NowPlayingWidgetProps = $props();

	const DISMISS_KEY = 'lastfm-widget-dismissed';

	let isPlaying = $state(false);
	let track = $state<NowPlayingTrack | null>(null);
	let widgetEl = $state<HTMLDivElement | null>(null);
	let isDragging = $state(false);
	let wasDragged = $state(false);
	let dismissed = $state(false);
	let dragOffset = { x: 0, y: 0 };

	let trackEl = $state<HTMLSpanElement | null>(null);
	let artistEl = $state<HTMLSpanElement | null>(null);
	let albumEl = $state<HTMLSpanElement | null>(null);
	let trackOverflows = $state(false);
	let artistOverflows = $state(false);
	let albumOverflows = $state(false);

	const shouldShow = $derived(Boolean(track) && (isPlaying || showWhenIdle) && !dismissed);
	const statusText = $derived(isPlaying ? 'Now playing' : idleLabel);

	function checkOverflow(el: HTMLSpanElement | null): boolean {
		if (!el) return false;
		return el.scrollWidth > el.clientWidth;
	}

	$effect(() => {
		// Re-run when track changes
		void track;
		tick().then(() => {
			trackOverflows = checkOverflow(trackEl);
			artistOverflows = checkOverflow(artistEl);
			albumOverflows = checkOverflow(albumEl);
		});
	});

	function dismiss(e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
		dismissed = true;
		try {
			localStorage.setItem(DISMISS_KEY, '1');
		} catch {}
	}

	function getInitialPosition(): { top?: string; bottom?: string; left?: string; right?: string } {
		switch (position) {
			case 'bottom-right':
				return { bottom: '1rem', right: '1rem' };
			case 'bottom-left':
				return { bottom: '1rem', left: '1rem' };
			case 'top-right':
				return { top: '1rem', right: '1rem' };
			case 'top-left':
				return { top: '1rem', left: '1rem' };
		}
	}

	function onPointerDown(e: PointerEvent) {
		if (!widgetEl) return;
		const rect = widgetEl.getBoundingClientRect();
		dragOffset.x = e.clientX - rect.left;
		dragOffset.y = e.clientY - rect.top;
		isDragging = true;
		wasDragged = false;
		widgetEl.setPointerCapture(e.pointerId);
		e.preventDefault();
	}

	function onPointerMove(e: PointerEvent) {
		if (!isDragging || !widgetEl) return;
		wasDragged = true;

		const x = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - widgetEl.offsetWidth));
		const y = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - widgetEl.offsetHeight));

		widgetEl.style.left = `${x}px`;
		widgetEl.style.top = `${y}px`;
		widgetEl.style.right = 'auto';
		widgetEl.style.bottom = 'auto';
	}

	function onPointerUp(e: PointerEvent) {
		if (!widgetEl) return;
		isDragging = false;
		widgetEl.releasePointerCapture(e.pointerId);
	}

	function handleClick(e: MouseEvent) {
		if (wasDragged) {
			e.preventDefault();
			e.stopPropagation();
			wasDragged = false;
		}
	}

	async function fetchNowPlaying() {
		try {
			const response = await fetch(nowPlayingUrl, {
				headers: {
					Accept: 'application/json'
				},
				cache: 'no-store'
			});

			if (!response.ok) {
				throw new Error('Failed to load now playing');
			}

			const data: NowPlayingResponse = await response.json();
			isPlaying = Boolean(data?.isPlaying);
			track = data?.track ?? null;
		} catch (error) {
			isPlaying = false;
			track = null;
		}
	}

	let positionApplied = false;

	$effect(() => {
		if (widgetEl && !positionApplied) {
			const pos = getInitialPosition();
			Object.assign(widgetEl.style, pos);
			positionApplied = true;
		}
	});

	onMount(() => {
		try {
			dismissed = localStorage.getItem(DISMISS_KEY) === '1';
		} catch {}

		fetchNowPlaying();

		const intervalId = setInterval(() => {
			fetchNowPlaying();
		}, refreshIntervalMs);

		return () => {
			clearInterval(intervalId);
		};
	});
</script>

{#if shouldShow}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="lastfm-widget {className}"
		class:dragging={isDragging}
		bind:this={widgetEl}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		aria-live="polite"
		role="status"
	>
		<button class="close-btn" onclick={dismiss} aria-label="Dismiss now playing widget">&times;</button>
		<div class="artwork">
			{#if track?.image}
				<img
					src={track.image}
					alt={`Album art for ${track?.name} by ${track?.artist}`}
					loading="lazy"
					draggable="false"
				/>
			{:else}
				<div class="placeholder" aria-hidden="true">FM</div>
			{/if}
		</div>
		<a
			class="details"
			href={track?.url}
			target="_blank"
			rel="noreferrer"
			onclick={handleClick}
		>
			<span class="status">
				<span class="dot {isPlaying ? 'playing' : ''}" aria-hidden="true"></span>
				{statusText}
			</span>
			<span class="track" class:scrollable={trackOverflows} bind:this={trackEl}>
				<span class="marquee-inner">{track?.name}</span>
			</span>
			<span class="artist" class:scrollable={artistOverflows} bind:this={artistEl}>
				<span class="marquee-inner">{track?.artist}</span>
			</span>
			{#if track?.album}
				<span class="album" class:scrollable={albumOverflows} bind:this={albumEl}>
					<span class="marquee-inner">{track.album}</span>
				</span>
			{/if}
		</a>
	</div>
{/if}

<style lang="postcss">
	.lastfm-widget {
		position: fixed;
		display: grid;
		grid-template-columns: 56px 1fr;
		gap: 0.4rem;
		align-items: center;
		padding: 0.25rem;
		background: var(--color-white-lightest);
		border: 2px solid var(--color-primary-darker);
		border-radius: 8px;
		box-shadow: var(--box-shadow-elev-1);
		color: var(--color-primary-darkest);
		font-family: var(--font-oswald);
		width: 280px;
		z-index: 10000;
		cursor: grab;
		user-select: none;
		touch-action: none;
		transition: box-shadow 0.2s ease;
	}

	.lastfm-widget.dragging {
		cursor: grabbing;
		box-shadow: var(--box-shadow-elev-2);
		opacity: 0.92;
	}

	.lastfm-widget:not(.dragging):hover {
		box-shadow: var(--box-shadow-elev-2);
	}

	.close-btn {
		position: absolute;
		top: -0.5rem;
		right: -0.5rem;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 999px;
		border: 1px solid var(--color-primary-darker);
		background: var(--color-white-lightest);
		color: var(--color-tertiary);
		font-size: 0.85rem;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		opacity: 0;
		transition: opacity 0.15s ease, color 0.15s ease, background 0.15s ease;
		z-index: 1;
		touch-action: manipulation;
	}

	.lastfm-widget:hover .close-btn,
	.close-btn:focus-visible {
		opacity: 1;
	}

	.close-btn:hover {
		background: var(--color-primary-darker);
		color: var(--color-white-lightest);
	}

	.close-btn:focus-visible {
		outline: 2px solid var(--color-secondary);
		outline-offset: 1px;
	}

	.artwork {
		width: 56px;
		height: 56px;
		border-radius: 6px;
		background: var(--color-white-darker);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border: 1px solid var(--color-primary-darker);
		flex-shrink: 0;
	}

	.artwork img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
	}

	.placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-secondary-lighter);
		color: var(--color-primary-darkest);
		font-size: 0.75rem;
		letter-spacing: 0.1em;
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
		min-width: 0;
		overflow: hidden;
		text-decoration: none;
		color: inherit;
		cursor: pointer;
		padding-right: 0.25rem;
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-tertiary);
		line-height: 1.4;
	}

	.dot {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 999px;
		background: var(--color-secondary);
		flex-shrink: 0;
	}

	.dot.playing {
		animation: pulse 1.6s ease-in-out infinite;
	}

	.track,
	.artist,
	.album {
		display: block;
		overflow: hidden;
		white-space: nowrap;
		position: relative;
	}

	.track {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-primary-darkest);
		line-height: 1.3;
	}

	.artist {
		font-size: 0.85rem;
		color: var(--color-tertiary);
		line-height: 1.3;
	}

	.album {
		font-size: 0.8rem;
		color: var(--color-tertiary);
		line-height: 1.3;
	}

	.marquee-inner {
		display: inline-block;
	}

	.scrollable .marquee-inner {
		padding-right: 2.5rem;
	}

	.lastfm-widget:not(.dragging):hover .scrollable .marquee-inner {
		animation: marquee 6s linear infinite;
	}

	@keyframes marquee {
		0% {
			transform: translateX(0);
		}
		15% {
			transform: translateX(0);
		}
		85% {
			transform: translateX(calc(-100% + 200px));
		}
		100% {
			transform: translateX(calc(-100% + 200px));
		}
	}

	@keyframes pulse {
		0% {
			box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.8);
		}
		70% {
			box-shadow: 0 0 0 6px rgba(255, 255, 255, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
		}
	}

	@media (max-width: 480px) {
		.lastfm-widget {
			width: 250px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lastfm-widget {
			transition: none;
		}

		.dot.playing {
			animation: none;
		}

		.lastfm-widget:hover .scrollable .marquee-inner {
			animation: none;
		}
	}
</style>

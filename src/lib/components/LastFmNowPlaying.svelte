<script lang="ts">
	import { onMount } from 'svelte';

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

	let isPlaying = $state(false);
	let track = $state<NowPlayingTrack | null>(null);

	const shouldShow = $derived(Boolean(track) && (isPlaying || showWhenIdle));
	const statusText = $derived(isPlaying ? 'Now playing' : idleLabel);
	const positionClass = $derived(`lastfm--${position}`);

	async function fetchNowPlaying() {
		try {
			const response = await fetch('/api/lastfm/now-playing', {
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

	onMount(() => {
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
	<a
		class="lastfm-widget {positionClass} {className}"
		href={track?.url}
		target="_blank"
		rel="noreferrer"
		aria-live="polite"
	>
		<div class="artwork">
			{#if track?.image}
				<img
					src={track.image}
					alt={`Album art for ${track?.name} by ${track?.artist}`}
					loading="lazy"
				/>
			{:else}
				<div class="placeholder" aria-hidden="true">FM</div>
			{/if}
		</div>
		<div class="details">
			<span class="status">
				<span class="dot {isPlaying ? 'playing' : ''}" aria-hidden="true"></span>
				{statusText}
			</span>
			<span class="track">{track?.name}</span>
			<span class="artist">{track?.artist}</span>
			{#if track?.album}
				<span class="album">{track.album}</span>
			{/if}
		</div>
	</a>
{/if}

<style lang="postcss">
	.lastfm-widget {
		position: fixed;
		display: grid;
		grid-template-columns: 52px 1fr;
		gap: 0.75rem;
		align-items: center;
		padding: 0.75rem 0.85rem;
		background: var(--color-white-lightest);
		border: 2px solid var(--color-primary-darker);
		border-radius: 12px;
		box-shadow: var(--box-shadow-elev-1);
		text-decoration: none;
		color: var(--color-primary-darkest);
		font-family: var(--font-oswald);
		max-width: min(320px, 90vw);
		z-index: 10000;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.lastfm-widget:hover,
	.lastfm-widget:focus-visible {
		transform: translateY(-2px);
		box-shadow: var(--box-shadow-elev-2);
	}

	.lastfm-widget:focus-visible {
		outline: 2px solid var(--color-secondary);
		outline-offset: 2px;
	}

	.lastfm--bottom-right {
		bottom: 1rem;
		right: 1rem;
	}

	.lastfm--bottom-left {
		bottom: 1rem;
		left: 1rem;
	}

	.lastfm--top-right {
		top: 1rem;
		right: 1rem;
	}

	.lastfm--top-left {
		top: 1rem;
		left: 1rem;
	}

	.artwork {
		width: 52px;
		height: 52px;
		border-radius: 8px;
		background: var(--color-white-darker);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border: 2px solid var(--color-primary-darker);
	}

	.artwork img {
		width: 100%;
		height: 100%;
		object-fit: cover;
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
		gap: 0.1rem;
		min-width: 0;
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.55rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--color-tertiary);
	}

	.dot {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 999px;
		background: var(--color-secondary);
		box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.2);
	}

	.dot.playing {
		animation: pulse 1.6s ease-in-out infinite;
	}

	.track {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-primary-darkest);
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.artist,
	.album {
		font-size: 0.75rem;
		color: var(--color-tertiary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@keyframes pulse {
		0% {
			box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.8);
		}
		70% {
			box-shadow: 0 0 0 8px rgba(255, 255, 255, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
		}
	}

	@media (max-width: 480px) {
		.lastfm-widget {
			grid-template-columns: 44px 1fr;
			padding: 0.6rem 0.7rem;
		}

		.artwork {
			width: 44px;
			height: 44px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lastfm-widget {
			transition: none;
		}

		.dot.playing {
			animation: none;
		}
	}
</style>

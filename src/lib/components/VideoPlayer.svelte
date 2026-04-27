<script lang="ts">
	import 'media-chrome';

	type VideoPlayerProps = {
		title?: string;
		url: string;
	};

	let { title, url }: VideoPlayerProps = $props();
</script>

<svelte:head>
	<script type="module" src="https://cdn.jsdelivr.net/npm/media-chrome@4/+esm"></script>
	<script type="module" src="https://cdn.jsdelivr.net/npm/youtube-video-element@1.1/+esm"></script>
</svelte:head>

<div class="video-player-wrapper">
	{#if title}
		<h3 class="video-title">{title}</h3>
	{/if}
	<media-controller noautohide>
		<youtube-video src={url} slot="media" controls="0" crossorigin></youtube-video>
		<media-loading-indicator slot="centered-chrome" noautohide></media-loading-indicator>
		<media-control-bar>
			<media-play-button></media-play-button>
			<media-mute-button></media-mute-button>
			<media-volume-range></media-volume-range>
			<media-time-range></media-time-range>
			<media-time-display showduration></media-time-display>
			<media-playback-rate-button></media-playback-rate-button>
			<media-fullscreen-button></media-fullscreen-button>
		</media-control-bar>
	</media-controller>
</div>

<style lang="postcss">
	.video-player-wrapper {
		border: var(--border-width) solid var(--color-primary-darker);
		padding: 1rem;
	}

	.video-title {
		margin: 0 0 0.75rem 0;
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		color: var(--color-primary-darker);
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	media-controller {
		display: block;
		width: 100%;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		--media-primary-color: #fff;
		--media-secondary-color: rgba(0, 0, 0, 0.8);
		--media-control-background: rgba(0, 0, 0, 0.75);
		--media-control-hover-background: rgba(0, 0, 0, 0.9);
	}

	media-controller [slot='media'],
	media-controller youtube-video {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	media-controller youtube-video {
		display: block;
	}
</style>

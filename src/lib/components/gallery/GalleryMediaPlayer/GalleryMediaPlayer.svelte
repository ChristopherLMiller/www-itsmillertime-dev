<script lang="ts">
	import 'media-chrome';
	import type { Media } from '$lib/types/payload-types';
	import { getMediaUrl } from '$lib/utils/media-url';

	type GalleryMediaPlayerProps = {
		media: Media;
		useProxy?: boolean;
		className?: string;
	};

	let { media, useProxy = false, className = '' }: GalleryMediaPlayerProps = $props();

	const videoUrl = $derived(media?.url ? getMediaUrl(media.url, useProxy) : '');
	const isYouTube = $derived(
		!!videoUrl && (videoUrl.includes('youtube.com/watch') || videoUrl.includes('youtu.be/'))
	);
	const aspectRatio = $derived.by(() => {
		const thumb = media?.sizes?.thumbnail;
		if (thumb?.width && thumb?.height) return `${thumb.width} / ${thumb.height}`;
		if (media?.width && media?.height) return `${media.width} / ${media.height}`;
		return '16 / 9';
	});
</script>

<svelte:head>
	<script type="module" src="https://cdn.jsdelivr.net/npm/media-chrome@4/+esm"></script>
	<script type="module" src="https://cdn.jsdelivr.net/npm/youtube-video-element@1.1/+esm"></script>
</svelte:head>

<div
	class="gallery-media-player {className}"
	style:--aspect-ratio={aspectRatio}
	onclick={(e) => e.stopPropagation()}
	onkeydown={(e) => e.stopPropagation()}
	role="presentation"
>
	<media-controller noautohide>
		{#if isYouTube}
			<youtube-video src={videoUrl} slot="media" controls="0" crossorigin="anonymous"
			></youtube-video>
		{:else}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video slot="media" src={videoUrl} crossorigin="anonymous" playsinline></video>
		{/if}
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
	.gallery-media-player {
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.gallery-media-player media-controller {
		display: block;
		width: 100%;
		height: 100%;
		aspect-ratio: var(--aspect-ratio, 16 / 9);
		overflow: hidden;
		--media-primary-color: #fff;
		--media-secondary-color: rgba(0, 0, 0, 0.8);
		--media-control-background: rgba(0, 0, 0, 0.75);
		--media-control-hover-background: rgba(0, 0, 0, 0.9);
	}

	.gallery-media-player media-controller [slot='media'],
	.gallery-media-player media-controller video,
	.gallery-media-player media-controller youtube-video {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.gallery-media-player media-controller youtube-video {
		display: block;
	}
</style>

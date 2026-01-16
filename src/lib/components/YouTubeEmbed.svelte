<script lang="ts">
	import { onMount } from 'svelte';
	import { extractYouTubeId } from '../../utilities/extractYouTubeId';
	import videojs from 'video.js';
	import 'video.js/dist/video-js.css';
	import 'videojs-youtube';
	import type Player from 'video.js/dist/types/player';

	type YouTubeEmbedProps = {
		title: string;
		url: string;
	};

	const { title, url }: YouTubeEmbedProps = $props();

	const videoId = $derived(extractYouTubeId(url));
	let videoElement: HTMLVideoElement;
	let player: Player | null = null;

	onMount(() => {
		if (videoId && videoElement) {
			player = videojs(videoElement, {
				techOrder: ['youtube'],
				sources: [{
					type: 'video/youtube',
					src: `https://www.youtube.com/watch?v=${videoId}`
				}],
				youtube: {
					ytControls: 0
				}
			});
		}

		return () => {
			if (player) {
				player.dispose();
			}
		};
	});
</script>

{#if videoId}
	<div class="video-wrapper">
		{#if title}
			<h3 class="video-title">{title}</h3>
		{/if}
		<div class="video-container">
			<video
				bind:this={videoElement}
				class="video-js vjs-default-skin"
				controls
				preload="auto"
			></video>
		</div>
	</div>
{:else}
	<div class="video-wrapper">
		<p class="error">Invalid YouTube URL</p>
	</div>
{/if}

<style>
	.video-wrapper {
		border: var(--border-width) solid var(--color-primary-darker);
		background: var(--linen-paper);
		padding: 1rem;
	}

	.video-title {
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		color: var(--color-primary-darker);
		margin: 0 0 0.75rem 0;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.video-container {
		position: relative;
		padding-bottom: 56.25%; /* 16:9 aspect ratio */
		height: 0;
		overflow: hidden;
		background: var(--color-tertiary-darker);
	}

	.video-container :global(.video-js) {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.error {
		color: var(--color-tertiary);
		font-style: italic;
		margin: 0;
	}
</style>

<script lang="ts">
	import { extractYouTubeId } from '../../utilities/extractYouTubeId';

	type YouTubeEmbedProps = {
		title: string;
		url: string;
	};

	const { title, url }: YouTubeEmbedProps = $props();

	const videoId = $derived(extractYouTubeId(url));
	const embedUrl = $derived(videoId ? `https://www.youtube.com/embed/${videoId}` : null);
</script>

{#if embedUrl}
	<div class="video-wrapper">
		{#if title}
			<h3 class="video-title">{title}</h3>
		{/if}
		<div class="video-container">
			<iframe
				src={embedUrl}
				title={title || 'YouTube video'}
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowfullscreen
				loading="lazy"
			></iframe>
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

	.video-container iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border: 0;
	}

	.error {
		color: var(--color-tertiary);
		font-style: italic;
		margin: 0;
	}
</style>

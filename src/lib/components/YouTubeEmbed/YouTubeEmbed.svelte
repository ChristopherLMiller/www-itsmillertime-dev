<script lang="ts">
	import VideoPlayer from '$lib/components/VideoPlayer';

	type YouTubeEmbedProps = {
		title?: string;
		url: string;
	};

	const { title, url }: YouTubeEmbedProps = $props();
</script>

<!-- Prefer media-chrome VideoPlayer; video.js was unused in production. -->
<VideoPlayer {title} {url} />

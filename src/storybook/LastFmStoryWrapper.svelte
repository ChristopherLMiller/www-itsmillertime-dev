<script lang="ts">
	import { onDestroy } from 'svelte';
	import LastFmNowPlaying from '$lib/components/LastFmNowPlaying.svelte';

	const origFetch = globalThis.fetch.bind(globalThis);
	globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
		if (String(input).includes('/api/lastfm/')) {
			return Promise.resolve(
				new Response(
					JSON.stringify({
						isPlaying: true,
						track: {
							name: 'Example track',
							artist: 'Example artist',
							album: 'Example album',
							url: 'https://example.com',
							image: null
						}
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				)
			);
		}
		return origFetch(input, init);
	};

	onDestroy(() => {
		globalThis.fetch = origFetch;
	});
</script>

<LastFmNowPlaying showWhenIdle={true} refreshIntervalMs={600_000} />

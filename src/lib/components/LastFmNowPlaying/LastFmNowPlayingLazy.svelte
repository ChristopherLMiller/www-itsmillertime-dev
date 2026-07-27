<script lang="ts">
	/**
	 * Defers Last.fm widget JS/network until after first paint so it stays off
	 * the critical path on every (site) page.
	 */
	import { browser } from '$app/environment';
	import type { Component } from 'svelte';
	import { onMount } from 'svelte';

	let Widget = $state<Component | null>(null);

	onMount(() => {
		if (!browser) return;

		let cancelled = false;
		let idleId: number | undefined;
		let idleTimeoutId: ReturnType<typeof setTimeout> | undefined;

		function load() {
			if (cancelled) return;
			void import('$lib/components/LastFmNowPlaying/LastFmNowPlaying.svelte').then((mod) => {
				if (!cancelled) Widget = mod.default;
			});
		}

		const ric = (
			window as Window & {
				requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
			}
		).requestIdleCallback;
		if (typeof ric === 'function') {
			idleId = ric(load, { timeout: 4000 });
		} else {
			idleTimeoutId = setTimeout(load, 2000);
		}

		return () => {
			cancelled = true;
			const cancelIdle = (
				window as Window & { cancelIdleCallback?: (id: number) => void }
			).cancelIdleCallback;
			if (idleId !== undefined && typeof cancelIdle === 'function') cancelIdle(idleId);
			if (idleTimeoutId !== undefined) clearTimeout(idleTimeoutId);
		};
	});
</script>

{#if Widget}
	<Widget />
{/if}

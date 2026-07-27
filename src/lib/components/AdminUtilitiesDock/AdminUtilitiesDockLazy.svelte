<script lang="ts">
	/**
	 * Lazy-loads the admin utilities dock (and highlight.js) only for admins
	 * so public visitors do not pay for that JS on the critical path.
	 */
	import { page } from '$app/state';
	import type { Component } from 'svelte';

	let Dock = $state<Component | null>(null);

	const isAdmin = $derived(
		!!page.data.session?.user &&
			(page.data.session?.user?.role as string[] | undefined)?.includes('admin')
	);

	$effect(() => {
		if (!isAdmin || Dock) return;
		let cancelled = false;
		void import('$lib/components/AdminUtilitiesDock/AdminUtilitiesDock.svelte').then((mod) => {
			if (!cancelled) Dock = mod.default;
		});
		return () => {
			cancelled = true;
		};
	});
</script>

{#if isAdmin && Dock}
	<Dock />
{/if}

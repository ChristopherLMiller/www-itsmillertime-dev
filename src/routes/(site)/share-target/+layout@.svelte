<script lang="ts">
	/**
	 * Layout reset: skip `(site)/+layout.svelte` and `(site)/+layout.ts` so this route
	 * does not block on `/api/layout-data` (problematic for PWA share-target cold opens).
	 */
	import '../styles.css';

	let { children } = $props();
</script>

{@render children?.()}

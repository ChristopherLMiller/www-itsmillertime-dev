<script lang="ts">
	/**
	 * Standalone route (outside `(site)`) so PWA share-target navigations never run
	 * `(site)/+layout.ts` (which always fetches `/api/layout-data` via universal fetch).
	 */
	import '../(site)/styles.css';

	let { children } = $props();
</script>

{@render children?.()}

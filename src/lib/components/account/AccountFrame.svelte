<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="account-frame">
	{@render children()}
</div>

<style>
	.account-frame {
		background: var(--color-white-lightest);
		color: var(--color-tertiary-darkest);
		border: 1px solid var(--color-tertiary-lighter);
		box-shadow: var(--box-shadow-elev-1);
		padding: 0.85rem 1rem;
	}
</style>

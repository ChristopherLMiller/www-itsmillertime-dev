<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		kind,
		children
	}: {
		kind: 'error' | 'success';
		children: Snippet;
	} = $props();
</script>

<p class="account-flash account-flash--{kind}" role={kind === 'error' ? 'alert' : 'status'}>
	{@render children()}
</p>

<style>
	.account-flash {
		margin: 0;
		padding: 0.4rem 0.55rem;
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		line-height: 1.4;
		border-radius: 4px;
	}

	.account-flash--error {
		background: oklch(0.9 0.05 25);
		border: 1px solid var(--color-primary);
		color: var(--color-primary-darker);
	}

	.account-flash--success {
		background: oklch(0.93 0.04 145);
		border: 1px solid var(--color-tertiary-lighter);
		color: var(--color-tertiary-darkest);
	}
</style>

<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		hint,
		children
	}: {
		label: string;
		hint?: string;
		children: Snippet;
	} = $props();
</script>

<label class="account-field">
	<span>{label}</span>
	{@render children()}
	{#if hint}
		<small class="account-hint">{hint}</small>
	{/if}
</label>

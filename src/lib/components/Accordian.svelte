<script lang="ts">
	let { summary, children } = $props();
</script>

<details class="accordian">
	<summary class="font-oswald">{summary}</summary>
	{@render children?.()}
</details>

<style lang="postcss">
	:global(:not(details + details)) {
		border-bottom: var(--border-width) solid var(color-primary-lighter);
	}
	summary {
		padding: 1rem;
		background: var(--color-tertiary-darker);
		color: var(--color-white);
	}
</style>

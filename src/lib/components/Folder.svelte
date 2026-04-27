<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		children?: Snippet;
	}

	let { title = 'Untitled', children }: Props = $props();

	let isOpen = $state(false);

	function toggleFolder() {
		isOpen = !isOpen;
	}
</script>

<div class="folder">
	<div class="front" role="presentation" onclick={toggleFolder}>
		<span class="title">{title}</span>
	</div>
	<div class="contents">
		{#if isOpen}
			{#if typeof children === 'function'}
				{@render children?.()}
			{/if}
		{/if}
	</div>
	<div class="back"></div>
</div>

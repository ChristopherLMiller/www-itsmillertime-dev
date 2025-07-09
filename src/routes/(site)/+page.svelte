<script lang="ts">
	import Lexical from '$lib/Lexical.svelte';
	import Panel from '$lib/Panel.svelte';

	const { data } = $props();
	const pageData = data.page;
</script>

<Panel hasPadding={true} hasBorder={true}>
	{#each pageData.blocks as block}
		<Lexical data={block.block} />
	{/each}
</Panel>

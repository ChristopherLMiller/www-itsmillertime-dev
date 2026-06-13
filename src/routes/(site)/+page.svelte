<script lang="ts">
	import Lexical from '$lib/components/Lexical';
	import Panel from '$lib/components/Panel';

	const { data } = $props();
	const pageData = $derived(data.page);
</script>

<Panel hasPadding={true} hasBorder={true}>
	{#if pageData?.blocks}
		{#each pageData.blocks as block}
			<Lexical data={block.block} />
		{/each}
	{/if}
</Panel>

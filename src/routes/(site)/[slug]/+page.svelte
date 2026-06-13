<script lang="ts">
	import Lexical from '$lib/components/Lexical';
	import Panel from '$lib/components/Panel';

	const { data } = $props();
	const pageData = $derived(data.page);
</script>

{#each pageData.blocks as block}
	<Panel hasBorder hasPadding>
		<Lexical data={block.block} />
	</Panel>
{/each}

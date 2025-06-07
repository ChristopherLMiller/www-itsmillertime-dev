<script lang="ts">
	import Lexical from "$lib/Lexical.svelte";
	import Panel from "$lib/Panel.svelte";


  const {data} = $props();
  const pageData = $derived(data.page);

</script>

{#each pageData.blocks as block}
  <Panel hasBorder hasPadding>
    <Lexical data={block.block} />
  </Panel>
{/each}
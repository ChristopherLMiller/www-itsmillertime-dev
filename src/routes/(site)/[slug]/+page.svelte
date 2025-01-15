<script lang="ts">
	import Panel from "$lib/Panel.svelte";
	import SvelteMarkdown from "svelte-markdown";


  const {data} = $props();
  const pageData = $derived(data.page);

</script>

<Panel hasBorder hasPadding>
  <SvelteMarkdown source={pageData.content} />
</Panel>
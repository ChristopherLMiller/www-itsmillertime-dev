<script lang="ts">
	import Panel from "$lib/Panel.svelte";
	import SvelteMarkdown from "svelte-markdown";


  const {data} = $props();
  const pageData = data.page;

</script>

<Panel hasPadding={true} hasBorder={true}>
  <SvelteMarkdown source={pageData.content} />
</Panel>

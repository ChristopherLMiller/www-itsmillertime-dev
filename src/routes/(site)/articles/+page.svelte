<!-- src/routes/+page.svelte -->
<script lang="ts">
	import Excerpt from "$lib/Excerpt.svelte";
	import Newspaper from "$lib/Newspaper.svelte";
	import Paginator from "$lib/Paginator.svelte";
	import type { PageData } from "../$types";

  let { data }: { data: PageData } = $props();
</script>

<Newspaper heading="From My Desk">
  <div class="contents">
    {#each data.posts as post (post.id)}
      <Excerpt item={post}/>
    {/each}
  </div>
  {#snippet footerContent()}
    <span>Page {data.meta.pagingCounter} of {data.meta.totalPages} ({data.meta.totalDocs} total)</span>
  {/snippet}
</Newspaper>
<Paginator meta={data.meta}/>
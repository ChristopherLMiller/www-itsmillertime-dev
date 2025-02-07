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
    {#each data.posts.data as post (post.documentId)}
      <Excerpt item={post}/>
    {/each}
  </div>
  {#snippet footerContent()}
    <span>Page {data.posts.meta.pagination.page} of {data.posts.meta.pagination.pageCount} ({data.posts.meta.pagination.total} total)</span>
  {/snippet}
</Newspaper>
<Paginator meta={data.posts.meta}/>
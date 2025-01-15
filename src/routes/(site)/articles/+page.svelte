<!-- src/routes/+page.svelte -->
<script lang="ts">
	import Excerpt from "$lib/Excerpt.svelte";
	import Meta from "$lib/Newspaper/Meta.svelte";
	import Newspaper from "$lib/Newspaper/Newspaper.svelte";
	import Paginator from "$lib/Paginator.svelte";
	import type { PageData } from "../$types";

  let { data }: { data: PageData } = $props();
</script>

<Newspaper heading="From My Desk" footerContent={Meta}>
  <div class="contents">
    {#each data.posts.data as post (post.documentId)}
      <Excerpt item={post}/>
    {/each}
  </div>
</Newspaper>
<Paginator meta={data.posts.meta}/>
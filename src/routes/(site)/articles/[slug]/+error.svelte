<script lang="ts">
  import { page } from "$app/state";
  import Panel from "$lib/Panel.svelte";
</script>

<Panel hasBorder hasPadding>
  {#if page.status === 404}
    <h1>Page not found</h1>
  {:else}
  <h1>Something went wrong</h1>
  {/if}
  <p>{page.error?.message}</p>
  <p>Tried to fetch path: {page.url.pathname}</p>
</Panel>
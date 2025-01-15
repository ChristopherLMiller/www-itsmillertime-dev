<script lang="ts">
  import { page } from "$app/state";
  import Panel from "$lib/Panel.svelte";
</script>

<Panel hasPadding hasBorder>
  <h1>Something went wrong</h1>
  <h2>{page.status}</h2>
  <p>{page.error?.message}</p>
  <p>Tried to fetch path: {page.url.pathname}</p>
</Panel>
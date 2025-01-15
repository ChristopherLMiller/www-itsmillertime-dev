<script lang="ts">
  import { page } from "$app/state";
  const pagination = $derived(page.data.posts.meta.pagination);
</script>
<span>Page {pagination.page} of {pagination.pageCount} ({pagination.total} total)</span>
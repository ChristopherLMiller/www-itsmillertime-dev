<script lang="ts">
	import { goto } from "$app/navigation";
	let { meta } = $props();

  async function handlePageChange(newPage: number) {
    if (newPage >= 1 && newPage <= meta?.totalPages) {
      const url = new URL(window.location.href);
      url.searchParams.set('page', newPage.toString());
      await goto(url.toString(), { keepFocus: true, noScroll: false });
    }
  }

</script>

<div>
  <button onclick={() => handlePageChange(meta?.prevPage)} disabled={!meta?.hasPrevPage} aria-disabled={!meta?.hasPrevPage}>Previous Page</button>
  <button onclick={() => handlePageChange(meta?.nextPage)} disabled={!meta?.hasNextPage} aria-disabled={!meta?.hasNextPage}>Next Page</button>
</div>

<style lang="postcss">
  div {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    margin-block: 1rem;
  }

  button {
    background: var(--color-primary-darker);
    cursor: pointer;
    border: none;
    color: var(--color-tertiary-lightest);

    &:disabled {
      background: var(--color-tertiary-darker);
    }
  }
</style>
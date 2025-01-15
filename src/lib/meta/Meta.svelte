<script lang="ts">
  import { page } from "$app/state";

  let meta = $derived({
    ...page.data.meta
  })

  function generateTitle(title: string) {
    // Check if there is a site meta object for the path
    const pageMeta = page.data.siteMeta.find((pageMeta: {path: string}) => pageMeta.path.includes(page.url.pathname));

    if (pageMeta) {
      return `${pageMeta.title} | ItsMillerTime`;
    } else {
      return `${title} | ItsMillerTime`;
    }

  }
</script>

<svelte:head>
  <title>{generateTitle(meta.metaTitle)}</title>
  <meta name="description" content={meta.metaDescription} />

  <!-- OG -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content={generateTitle(meta.metaTitle)} />
  <meta property="og:description" content={meta.metaDescription} />
</svelte:head>
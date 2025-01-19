<script lang="ts">
  import { page } from "$app/state";

  let meta = $derived({
    ...page.data.meta
  })

  function generateTitle(title: string) {
    // Check if there is a site meta object for the path
    const pageMeta = page.data.siteMeta?.find((pageMeta: {path: string}) => pageMeta?.path.includes(page.url.pathname));

    if (pageMeta) {
      return `${pageMeta?.title} | ItsMillerTime`;
    } else {
      return `${title} | ItsMillerTime`;
    }
  }

  function getImage() {
    return 'https://cdn.itsmillertime.dev/6/default_cd50bfe553.jpg';
  }

  function generateDescription(description: string) {
    // Check if there is a site meta object for the path
    const pageMeta = page.data.siteMeta?.find((pageMeta: {path: string}) => pageMeta?.path.includes(page.url.pathname));    
    return pageMeta?.description || description
  }
</script>

<svelte:head>
  <title>{generateTitle(meta?.metaTitle)}</title>
  <meta name="description" content={generateDescription(meta?.metaDescription)} />
  <meta name="image" property="og:image" content={meta?.metaImage?.url || getImage()} />
  {#if meta?.canonicalURL}
    <link rel="canonical" href={meta?.canonicalURL} />
  {/if}

  <!-- OG -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content={generateTitle(meta?.metaTitle)} />
  <meta property="og:image" content={meta?.metaImage?.url || getImage()} />
  <meta property="og:description" content={generateDescription(meta?.metaDescription)} />
  {#if meta?.canonicalURL}
    <meta property="og:url" content={meta?.canonicalURL} />
  {/if}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={generateTitle(meta?.metaTitle)} />
  <meta name="twitter:description" content={generateDescription(meta?.metaDescription)} />
  <meta name="twitter:site" content="@itsmiller_time" />
  <meta name="twitter:image" content={meta?.metaImage?.url || getImage()} />
</svelte:head>
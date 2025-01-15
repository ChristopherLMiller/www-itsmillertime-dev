<script lang="ts">
  import { page } from '$app/state';

  const siteMeta = $derived(page.data.siteMeta);
  const path = $derived(page.url.pathname);
  const currentPage = $derived(siteMeta.find((pageMeta: {path: string}) => pageMeta.path.includes(path)))
</script>

<header>
  <div class="meta">
    <p class="page-description text-small">{currentPage?.description}</p>
    <p class="page-title text-large">{currentPage?.title}</p>
  </div>  
</header>

<style lang="postcss">
  header {
    font-family: var(--font-roboto);
    grid-area: header;
    color: var(--color-white-lighter);
    margin-block-end: var(--top-bar-height);
    clip-path: polygon(
      0 0,
      100% 0,
      100% calc(100% - clamp(3rem, 6vw, 6rem)),
      0 100%
    );
    background: var(--color-primary);
  }

  .meta {
    padding-inline: 2rem;
    padding-block: 1rem clamp(3rem, 6vw, 6rem);
    font-weight: 300;
    text-transform: capitalize;
    letter-spacing: -0.4px;

    .page-description {
      letter-spacing: 0.5px;
    }

    .page-title {
      padding-inline-start: 4rem;
      font-family: var(--font-special-elite)
      font-weight: 600;
      text-transform: uppercase;
      line-height: 1;
    }
  }
</style>
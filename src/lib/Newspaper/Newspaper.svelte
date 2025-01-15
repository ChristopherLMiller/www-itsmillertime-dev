<script>
	import Panel from "$lib/Panel.svelte";

  let {children, heading, image = null, columns = null, footerContent = null, headingTransitionName = null} = $props();
</script>

<Panel hasBorder={true} hasPadding={true}>
  <div class="heading" style:view-transition-name={headingTransitionName || 'newspaper-heading'}>
    {heading}
  </div>
  <div class="contents">
    <div class="columns" style:columns={columns || ''}>
      {#if image}
        <img src={image.url} alt={image.alt} />
      {/if}
      {@render children?.()}
    </div>
  </div>
  <div class="footer">
    {@render footerContent?.()}
  </div>
</Panel>

<style lang="postcss">
  .heading {
    font-size: var(--fs-xl);
    font-family: var(--font-oswald);
    font-weight: 300;
    text-align: center;
    color: var(--color-primary);
    letter-spacing: 5px;
    line-height: 1em;
    padding-block-end: 2rem;
  }
  .contents {
    padding-block: 2rem;
    border-top: 4px double var(--color-primary);
    border-bottom: 4px double var(--color-primary);
    text-align: justify;
    line-height: 1.5em;
  }

  .columns {
    column-rule: 2px solid var(--color-tertiary-lightest);
    column-width: 375px;

    @media screen and (max-width: 650px) {
      columns: 1 !important;
    }
  }

  img {
    margin-block-end: 2rem;
  }

  .footer {
    padding-block-start: 2rem;
    text-align: right;
  }
</style>
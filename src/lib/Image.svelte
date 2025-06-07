<script lang="ts">
  const {image, transitionName, hasBorder = false} = $props();
  
</script>

<picture style:view-transition-name={transitionName} class={`${hasBorder ? 'border' : ''}`}>
  {#each Object.entries(image?.sizes) as [key, value]}
    {#if value?.url !== null}
    <source srcset={value?.url} media={`(max-width: ${value?.width}px)"`} width={value?.width} height={value?.height} type={value?.mimeType}/>
    {/if}
  {/each}
  <img style:view-transition-name={transitionName} src={image?.sizes?.small?.url} width={image?.sizes?.small?.width} height={image?.sizes?.small?.height} alt={image?.alt} />
</picture>

<style>
  picture {
    display: block;
    width: 100%;
    height: auto;

  }
    .border {
      border: 5px solid var(--color-primary-darker);
    }
  
  img {
    display: block;
    width: 100%;
    height: auto;
  }
</style>
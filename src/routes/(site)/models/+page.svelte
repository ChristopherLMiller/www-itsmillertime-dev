<script lang="ts">
	import Image from "$lib/Image.svelte";
	import Panel from "$lib/Panel.svelte";
	import type { Model } from "$lib/types/payload-types";
	import type { PageData } from "../$types";
  let{data}: {data: PageData} = $props();
  let models: Model[] = $derived(data.models);

</script>

  <div class="grid">
  {#each models as model}
    <Panel hasBorder>
    
    {#if model?.model_meta?.featuredImage}
      <Image image={model.model_meta.featuredImage} transitionName={model.slug}/>
    {/if}
    <span>{model.title}</span>
    </Panel>
  {/each}
  </div>

<style lang="postcss">
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }
</style>
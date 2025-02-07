<script>
  import { fade } from 'svelte/transition';
  export let href = '';
  export let alt = '';
  
  let isOpen = false;
  let img;
  
  function handleClick() {
    isOpen = !isOpen;
  }
  
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      isOpen = false;
    }
  }
</script>

<div class="lightbox-container">
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <img
    src={href}
    alt={alt}
    class="thumbnail"
    onclick={handleClick}
    onkeydown={handleKeydown}
  />
  
  {#if isOpen}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="lightbox-overlay"
      onclick={handleClick}
      transition:fade
    >
      <div class="lightbox-content">
        <img
          src={href}
          {alt}
          class="lightbox-image"
          bind:this={img}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .lightbox-container {
    display: block;
  }
  
  .thumbnail {
    cursor: pointer;
    max-width: 100%;
    height: auto;
  }
  
  .lightbox-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .lightbox-content {
    max-width: 90vw;
    max-height: 90vh;
  }
  
  .lightbox-image {
    max-width: 100%;
    max-height: 90vh;
    object-fit: contain;
  }
</style>
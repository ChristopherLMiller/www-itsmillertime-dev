<script lang="ts">
  let {children, hasBorder = false, hasPadding = false, hasTexture = true} = $props();
</script>

<div class={`${hasBorder ? 'border' : ''} ${hasPadding ? 'padding' : ''} ${!hasTexture ? 'no-texture' : ''}`}>
  {@render children?.()}
</div>

<style lang="postcss">
  div {
    background: var(--color-white) var(--linen-paper);
    color: var(--color-tertiary-darker);
  }

  .no-texture {
    background: var(--color-white);
  }

  .border {
    border: var(--border-width) solid var(--color-primary-darker);
  }

  .padding {
    padding: clamp(1rem, 1rem + 1vw, 2rem);
  }
</style>
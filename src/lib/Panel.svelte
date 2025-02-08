<script lang="ts">
  let {children, hasBorder = false, hasPadding = false} = $props();
</script>

<div class={`${hasBorder ? 'border' : ''} ${hasPadding ? 'padding' : ''}`}>
  {@render children?.()}
</div>

<style lang="postcss">
  div {
    background: var(--color-white) var(--linen-paper);
    color: var(--color-tertiary-darker);
  }

    .border {
      border: 5px solid var(--color-primary-darker);
    }

    .padding {
      padding: clamp(1rem, 1rem + 1vw, 2rem);
    }
</style>
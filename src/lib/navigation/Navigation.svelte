<script lang="ts">
  import { page } from '$app/state';
  import NavButton from './NavButton.svelte';
  import NavLink from './NavLink.svelte';

</script>

  <nav>
    <ul>
      {#each page.data.navigation.sort((a, b) => a.order - b.order) as navItem }
        {#if navItem.children.length > 0}
          <NavButton {navItem} />
        {:else}
          <NavLink {navItem} />
        {/if}
      {/each}
    </ul>
  </nav>

<style lang="postcss">
  nav {
    grid-area: nav;
  }

  ul {
    margin-block-end: var(--top-bar-height);
    padding-inline: 0;
    background: var(--color-secondary-darker);
    display: none;
    justify-content: space-evenly;
    box-shadow: 14px -14px 0px var(--color-primary);
    flex-wrap: wrap;
    margin-inline: auto;
    height: min-content;
    width: fit-content;

    @media (min-width: 415px) {
      display: flex;
    }
  }
</style>
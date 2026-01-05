<script lang="ts">
  let {navItem} = $props();
  import { page } from '$app/state';
	import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
  import NavLink from './NavLink.svelte';
</script>

<button class={`${navItem.path === page.url.pathname ? 'active' : ''}`}>
  {#if navItem.icon}
    <img src={`${PUBLIC_PAYLOAD_URL}${navItem.icon.url}`} alt={navItem.title} />
  {/if}
  <span>{navItem.title}</span>
  <div class={`sub-menu`}>
    {#each navItem.childNodes as child}
      <NavLink navItem={child} />
    {/each}
  </div>
</button>

<style lang="postcss">
  button {
    min-width: 175px;
    font-family: var(--font-source-code-pro);
    border: none;
    color: var(--color-white);
    text-decoration: none;
    font-weight: 300;
    padding: 0.5rem 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    position: relative;
    background: var(--color-secondary-darker);
    box-shadow: var(--box-shadow-elev-0);
    transition: all 0.2s cubic-bezier(0.6, -0.28, 0.74, 0.05);
    cursor: pointer;
    
    &.active {
      background: var(--color-secondary);
      box-shadow: var(--box-shadow-elev-0);
    }

    &:hover {
      box-shadow: 7px -7px var(--color-primary-darker), var(--box-shadow-elev-1);
      transform: translateX(-7px) translateY(7px);
      background: var(--color-secondary);
      z-index: 1;

      .sub-menu {
        display: flex;
      }
    }

    .sub-menu {
      display: none;
      left: 0;
      top: 100%;
      width: 100%;
      flex-direction: column;
      position: absolute;
      list-style-type: none;
      padding-inline-start: 0;
      background: var(--color-secondary);
    }

    img {
      width: 30px;
      height: 30px;
    }
  }
</style>
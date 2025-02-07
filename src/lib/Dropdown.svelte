<script lang="ts">
	import type { Snippet } from "svelte";
	import { fly } from "svelte/transition";
	import { anchor } from "../actions/anchor";

    let {children, popoverId, button}: { children: Snippet, popoverId: string, button: Snippet} = $props();
</script>

<div class="dropdown-menu">
  <button popovertarget={popoverId} class="dropdown-button button-reset" use:anchor={{ id: popoverId, position: ['BOTTOM','RIGHT']}}>{@render button()}</button>
  <div popover="auto" id={popoverId} class="dropdown-links" transition:fly>
    {@render children?.()}
  </div>
</div>

<style lang="postcss">
  .dropdown-menu {
    position: relative;
    display: block;
  }

  [popover] {
    color: var(--color-primary);
  }

  .dropdown-button {
    cursor: pointer;
    font-weight: 300;
    line-height: 1em;
    vertical-align: bottom;
    background: none;
    border: none;
  }

  .dropdown-links {
    z-index: 10;
    position: absolute;
    translate: 0px 3px;
  }
</style>
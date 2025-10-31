<script lang="ts">
	import type { Snippet } from 'svelte';
	import { anchor } from '../actions/anchor';

	let { children, popoverId, button }: { children: Snippet; popoverId: string; button: Snippet } =
		$props();
	let dropdownDialog: HTMLDialogElement | undefined | null = $state(null);
</script>

<div class="dropdown-menu">
	<button
		class="dropdown-button button-reset"
		use:anchor={{ id: popoverId, position: ['BOTTOM', 'RIGHT'] }}
		onclick={() => dropdownDialog && dropdownDialog.showModal()}>{@render button()}</button
	>
	<dialog bind:this={dropdownDialog}>
		{@render children?.()}
	</dialog>
</div>

<style lang="postcss">
	.dropdown-menu {
		position: relative;
		display: block;
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

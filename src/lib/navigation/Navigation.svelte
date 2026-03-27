<script lang="ts">
	import { page } from '$app/state';
	import NavButton from './NavButton.svelte';
	import NavLink from './NavLink.svelte';
	import { filterNavItems } from './visibility';

	let user = $derived(page.data.session?.user ?? null);
	let visibleNavItems = $derived(filterNavItems(page.data.navigation.navItems, user));
</script>

<nav>
	<div class="nav-contents">
		{#each visibleNavItems as navItem}
			{#if navItem.childNodes && navItem.childNodes.length > 0}
				<NavButton {navItem} />
			{:else}
				<NavLink {navItem} />
			{/if}
		{/each}
	</div>
</nav>

<style lang="postcss">
	nav {
		grid-area: nav;
		position: sticky;
		top: var(--top-bar-height);
		z-index: 999;
	}

	.nav-contents {
		margin-block-end: var(--top-bar-height);
		padding-inline: 0;
		background: var(--color-secondary-darker);
		display: none;
		justify-content: space-evenly;
		box-shadow:
			14px -14px 0px var(--color-primary),
			var(--box-shadow-elev-1);
		flex-wrap: wrap;
		margin-inline: auto;
		height: min-content;
		width: fit-content;

		@media (min-width: 415px) {
			display: flex;
		}
	}
</style>

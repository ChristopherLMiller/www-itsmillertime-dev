<script lang="ts">
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';
	import { navStore, type NavState } from '../stores/navigation';
	import NavLink from './navigation/NavLink.svelte';

	let navState = $state<NavState>({ isOpen: false, activeDropdown: null });
	let currentPath = $state(page.url.pathname);

	// Subscribe to the store changes
	navStore.subscribe((state) => {
		navState = state;
	});

	// Watch for page changes and close navigation
	$effect(() => {
		const newPath = page.url.pathname;
		if (newPath !== currentPath) {
			currentPath = newPath;
			navStore.close();
		}
	});

	// Handle click outside to close dropdown
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.mobile-nav')) {
			navStore.close();
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="top-bar-element">
	<a class="text-small" href="/"><strong>I</strong>ts<strong>M</strong>iller<strong>T</strong>ime</a
	>
	<div class="mobile-nav">
		<button onclick={() => navStore.toggleDropdown('mobile')}>
			<span style:font-family="Oswald"><strong>M</strong>enu</span>
		</button>
		{#if navState.isOpen && navState.activeDropdown === 'mobile'}
			<div class="dropdown-links" transition:fly={{ y: 20, duration: 200 }}>
				<div class="dropdown-section account">
					<NavLink navItem={{ title: 'Login', path: '/login' }} />
					<NavLink navItem={{ title: 'Sign Up', path: '/sign-up' }} />
					<NavLink navItem={{ title: 'Sign Out', path: '/logout' }} />
					<NavLink navItem={{ title: 'Profile', path: '/profile' }} />
					<NavLink navItem={{ title: 'Admin', path: 'https://cms.itsmillertime.dev/admin' }} />
				</div>
				<div class="dropdown-section hide-on-desktop">
					{#each page.data.navigation.navItems as navItem}
						{#if navItem.childNodes.length > 0}
							{#each navItem.childNodes as childNavItem}
								<NavLink navItem={childNavItem} />
							{/each}
							<hr />
						{:else}
							<NavLink {navItem} />
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style lang="postcss">
	.top-bar-element {
		background: var(--color-tertiary-darker);
		padding-inline: 1vw;
		position: sticky;
		width: 100%;
		height: var(--top-bar-height);
		offset: 0;
		top: 0;
		z-index: 9999;
		flex-direction: row;
		display: flex;
		justify-content: space-between;
		align-items: center;
		box-shadow: var(--box-shadow-elev-1);

		.mobile-nav {
			display: block;
			font-size: var(--fs-s);
		}
		a {
			color: var(--color-primary);
			text-decoration: none;
			font-weight: 400;
			font-family: var(--font-oswald);

			strong {
				color: var(--color-white-lighter);
				font-weight: 400;
			}
		}

		button {
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
			top: var(--top-bar-height);
			width: 100vw;
			height: 100vh;
			left: 0;
			background: var(--color-secondary-darker);
		}
	}

	.hide-on-desktop {
		@media screen and (min-width: 415px) {
			display: none;
		}
	}
</style>

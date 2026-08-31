<script lang="ts">
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
	import { onMount } from 'svelte';
	import { rememberAdminReturnTo } from '$lib/admin/returnTo';
	import { isAdminRole } from '$lib/auth/isAdminRole';
	import { navStore, type NavState } from '../../../stores/navigation';
	import { filterNavItems } from '$lib/components/navigation/visibility';
	import { getSiteLayoutContext } from '$lib/query/siteLayoutContext';
	import CartDock from '$lib/components/commerce/CartDock.svelte';

	type MenuLink = {
		title: string;
		href: string;
		external?: boolean;
		reload?: boolean;
	};

	const siteLayout = getSiteLayoutContext();
	let navigation = $derived(siteLayout ? siteLayout().navigation : page.data.navigation);
	let user = $derived(page.data.session?.user ?? null);
	let isLoggedIn = $derived(!!user);
	let isAdmin = $derived(isAdminRole(user));
	let visibleNavItems = $derived(filterNavItems(navigation?.navItems ?? [], user));

	let navState = $state<NavState>({ isOpen: false, activeDropdown: null });
	let currentPath = $state(page.url.pathname);
	let menuDialog = $state<HTMLDialogElement | null>(null);

	const menuOpen = $derived(navState.isOpen && navState.activeDropdown === 'mobile');
	const cmsAdminUrl = `${PUBLIC_PAYLOAD_URL}/admin`;
	const storefrontUrl = env.PUBLIC_STOREFRONT_URL || 'https://store.itsmillertime.dev';
	const medusaAdminUrl = env.PUBLIC_MEDUSA_ADMIN_URL || 'https://medusa.itsmillertime.dev/app';
	const coolifyUrl = env.PUBLIC_COOLIFY_URL || 'https://coolify.itsmillertime.dev';
	const plausibleUrl = env.PUBLIC_PLAUSIBLE_URL || 'https://analytics.itsmillertime.dev';

	const accountLinks = $derived.by((): MenuLink[] => {
		if (isLoggedIn) {
			return [
				{ title: 'Profile', href: '/account/profile' },
				{ title: 'Sign Out', href: '/account/logout', reload: true }
			];
		}
		return [{ title: 'Login', href: '/account/login', reload: true }];
	});

	const appLinks = $derived.by((): MenuLink[] => {
		const links: MenuLink[] = [{ title: 'Storefront', href: storefrontUrl, external: true }];
		if (isAdmin) {
			links.push(
				{ title: 'Medusa App', href: medusaAdminUrl, external: true },
				{ title: 'Coolify', href: coolifyUrl, external: true },
				{ title: 'Plausible', href: plausibleUrl, external: true }
			);
		}
		return links;
	});

	const manageLinks = $derived.by((): MenuLink[] => {
		if (!isAdmin) return [];
		return [
			{ title: 'Site admin', href: '/admin' },
			{ title: 'Content Manager', href: cmsAdminUrl, external: true }
		];
	});

	const browseLinks = $derived.by((): MenuLink[] => {
		const links: MenuLink[] = [];
		for (const navItem of visibleNavItems) {
			if (navItem.childNodes?.length) {
				for (const child of navItem.childNodes) {
					links.push({ title: child.title, href: child.link });
				}
			} else {
				links.push({ title: navItem.title, href: navItem.link });
			}
		}
		return links;
	});

	navStore.subscribe((state: NavState) => {
		navState = state;
	});

	onMount(() => {
		navStore.close();
	});

	function goToSiteAdmin() {
		rememberAdminReturnTo(page.url);
		navStore.close();
	}

	$effect(() => {
		const newPath = page.url.pathname;
		if (newPath !== currentPath) {
			currentPath = newPath;
			navStore.close();
		}
	});

	$effect(() => {
		const dialog = menuDialog;
		if (!dialog) return;

		if (menuOpen && !dialog.open) {
			dialog.showModal();
		} else if (!menuOpen && dialog.open) {
			dialog.close();
		}
	});

	function handleDialogClose() {
		navStore.close();
	}

	function handleDialogClick(event: MouseEvent) {
		if (event.target === menuDialog) {
			navStore.close();
		}
	}

	function isActive(href: string): boolean {
		if (href.startsWith('http')) return false;
		return page.url.pathname === href;
	}
</script>

<!-- Spacer + fixed bar: sticky nudges on Chrome Android (esp. gallery transforms / overscroll). -->
<div class="top-bar-spacer" aria-hidden="true"></div>
<div class="top-bar-element">
	<a class="top-bar-element__brand" href="/"
		><strong>I</strong>ts<strong>M</strong>iller<strong>T</strong>ime</a
	>

	<div class="top-bar-element__end">
		<CartDock />
		<div class="menu-tab-wrap">
			<button
				type="button"
				class="menu-tab"
				class:menu-tab--open={menuOpen}
				aria-haspopup="dialog"
				aria-expanded={menuOpen}
				onclick={() => navStore.toggleDropdown('mobile')}
			>
				Menu
			</button>

			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<dialog
				bind:this={menuDialog}
				class="menu-dialog"
				aria-labelledby="menu-dialog-title"
				onclick={handleDialogClick}
				onclose={handleDialogClose}
				oncancel={handleDialogClose}
			>
				<div class="menu-dialog__panel">
					<div class="menu-dialog__header">
						<h2 class="menu-dialog__title" id="menu-dialog-title">Menu</h2>
						<button
							type="button"
							class="menu-dialog__close"
							onclick={() => navStore.close()}
							aria-label="Close menu"
						>
							Close
						</button>
					</div>
					<nav class="menu-dialog__nav" aria-labelledby="menu-dialog-title">
						{#if browseLinks.length > 0}
							<section class="menu-dialog__section hide-on-desktop" aria-label="Site navigation">
								<h2 class="menu-dialog__section-title">Browse</h2>
								<ul class="menu-dialog__links">
									{#each browseLinks as link (link.href)}
										<li>
											<a
												class="menu-dialog__link"
												class:menu-dialog__link--active={isActive(link.href)}
												href={link.href}
											>
												{link.title}
											</a>
										</li>
									{/each}
								</ul>
							</section>
						{/if}

						<section class="menu-dialog__section" aria-label="Account">
							<h2 class="menu-dialog__section-title">Account</h2>
							<ul class="menu-dialog__links">
								{#each accountLinks as link (link.href)}
									<li>
										<a
											class="menu-dialog__link"
											class:menu-dialog__link--active={isActive(link.href)}
											href={link.href}
											data-sveltekit-reload={link.reload || undefined}
										>
											{link.title}
										</a>
									</li>
								{/each}
							</ul>
						</section>

						<section class="menu-dialog__section" aria-label="Apps">
							<h2 class="menu-dialog__section-title">Apps</h2>
							<ul class="menu-dialog__links">
								{#each appLinks as link (link.href)}
									<li>
										<a
											class="menu-dialog__link"
											href={link.href}
											target="_blank"
											rel="noopener noreferrer"
										>
											<span>{link.title}</span>
											<span class="menu-dialog__link-external" aria-hidden="true">↗</span>
										</a>
									</li>
								{/each}
							</ul>
						</section>

						{#if manageLinks.length > 0}
							<section class="menu-dialog__section" aria-label="Site management">
								<h2 class="menu-dialog__section-title">Manage</h2>
								<ul class="menu-dialog__links">
									{#each manageLinks as link (link.href)}
										<li>
											{#if link.external}
												<a
													class="menu-dialog__link"
													href={link.href}
													target="_blank"
													rel="noopener noreferrer"
												>
													<span>{link.title}</span>
													<span class="menu-dialog__link-external" aria-hidden="true">↗</span>
												</a>
											{:else}
												<a
													class="menu-dialog__link"
													class:menu-dialog__link--active={isActive(link.href)}
													href={link.href}
													onclick={link.href === '/admin' ? goToSiteAdmin : undefined}
												>
													{link.title}
												</a>
											{/if}
										</li>
									{/each}
								</ul>
							</section>
						{/if}
					</nav>
				</div>
			</dialog>
		</div>
	</div>
</div>

<style lang="postcss">
	.top-bar-spacer {
		height: var(--top-bar-offset);
		width: 100%;
		pointer-events: none;
	}

	.top-bar-element {
		--menu-tab-overhang: 0.5rem;

		background: var(--color-tertiary-darker);
		padding-inline: 1vw;
		padding-top: env(safe-area-inset-top, 0px);
		position: fixed;
		inset-inline: 0;
		top: 0;
		width: 100%;
		height: var(--top-bar-offset);
		z-index: 10020;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		box-shadow: var(--box-shadow-elev-1);
		overflow: visible;

		.top-bar-element__brand {
			align-self: center;
			color: var(--color-primary);
			text-decoration: none;
			font-weight: 400;
			font-family: var(--font-oswald);
			font-size: var(--fs-s);

			strong {
				color: var(--color-white-lighter);
				font-weight: 400;
			}
		}
	}

	.top-bar-element__end {
		display: flex;
		align-items: flex-start;
		flex-shrink: 0;
		gap: 0.65rem;
		padding-inline-end: 0.15rem;
	}

	.menu-tab-wrap {
		position: relative;
		flex-shrink: 0;
	}

	.menu-tab {
		display: flex;
		align-items: center;
		justify-content: center;
		height: calc(var(--top-bar-height) + var(--menu-tab-overhang));
		margin: 0;
		padding: 0 1rem;
		border: none;
		border-radius: 0;
		background: var(--color-tertiary-lighter);
		color: var(--color-tertiary-darkest);
		font-family: var(--font-oswald);
		font-size: var(--fs-s);
		font-weight: 400;
		line-height: 1;
		cursor: pointer;
		transition:
			background 150ms ease,
			transform 150ms ease;
	}

	.menu-tab:hover {
		background: var(--color-tertiary-lightest);
		transform: translateY(3px);
	}

	.menu-tab--open {
		background: var(--color-secondary-darker);
		color: var(--color-white-lighter);
	}

	.menu-dialog {
		border: none;
		padding: 0;
		margin: 0;
		background: transparent;
		overflow: visible;
		position: fixed;
		inset: unset;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: auto;
		height: auto;
		max-width: min(calc(100vw - 2rem), 26rem);
		max-height: calc(100vh - 2rem);
		overscroll-behavior: contain;
	}

	.menu-dialog::backdrop {
		background: rgba(0, 0, 0, 0.65);
		overscroll-behavior: none;
		touch-action: none;
	}

	.menu-dialog__panel {
		width: min(26rem, calc(100vw - 2rem));
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
		overscroll-behavior: contain;
		touch-action: pan-y;
		padding: 1.25rem 1.375rem;
		background: var(--color-white) var(--linen-paper);
		border: var(--border-width) solid var(--color-primary-darker);
		color: var(--color-tertiary-darker);
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		box-shadow: none;
		animation: menu-panel-in 180ms ease;

		@media screen and (min-width: 768px) {
			box-shadow: var(--box-shadow-elev-1);
		}
	}

	.menu-dialog__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin: -0.25rem -0.25rem 1rem;
		padding: 0 0 0.85rem;
		border-bottom: 2px solid color-mix(in oklch, var(--color-primary-darker) 35%, transparent);
	}

	.menu-dialog__title {
		margin: 0;
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-primary-darker);
	}

	.menu-dialog__close {
		flex-shrink: 0;
		margin: 0;
		padding: 0.45rem 0.85rem;
		border: none;
		border-radius: 0;
		background: var(--color-tertiary-lighter);
		color: var(--color-tertiary-darkest);
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		font-weight: 400;
		letter-spacing: 0.06em;
		line-height: 1;
		text-transform: uppercase;
		cursor: pointer;
		transition:
			background 150ms ease,
			color 150ms ease;
	}

	.menu-dialog__close:hover {
		background: var(--color-secondary-darker);
		color: var(--color-white-lighter);
	}

	.menu-dialog__close:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.menu-dialog__nav {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	@media screen and (max-width: 767px) {
		.menu-dialog__nav {
			gap: 1.75rem;
		}

		.menu-dialog__header {
			margin-bottom: 1.25rem;
			padding-bottom: 1rem;
		}

		.menu-dialog__close {
			padding: 0.65rem 1rem;
			font-size: var(--fs-m);
		}

		.menu-dialog__links {
			gap: 0.35rem;
		}

		.menu-dialog__section-title {
			font-size: var(--fs-m);
		}

		.menu-dialog__link {
			padding: 0.85rem 0.5rem;
			font-size: var(--fs-m);
		}

		.menu-dialog__link-external {
			font-size: var(--fs-s);
		}
	}

	.menu-dialog__section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.menu-dialog__section-title {
		margin: 0;
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-primary-darker);

		@media screen and (min-width: 768px) {
			font-weight: 500;
		}
	}

	.menu-dialog__links {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.menu-dialog__link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.65rem 0.35rem;
		border-radius: 2px;
		color: var(--color-tertiary-darkest);
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		font-weight: 500;
		line-height: 1.35;
		text-decoration: none;
		transition:
			background 150ms ease,
			color 150ms ease;

		@media screen and (min-width: 768px) {
			padding: 0.55rem 0.25rem;
			font-family: var(--font-source-code-pro);
			font-weight: 400;
			color: var(--color-tertiary-darker);
		}
	}

	.menu-dialog__link:hover,
	.menu-dialog__link--active {
		background: var(--color-secondary-lighter);
		color: var(--color-primary-darkest);
	}

	.menu-dialog__link-external {
		flex-shrink: 0;
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
	}

	.hide-on-desktop {
		@media screen and (min-width: 768px) {
			display: none;
		}
	}

	@keyframes menu-panel-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.menu-tab:hover {
			transform: none;
		}

		.menu-dialog__panel {
			animation: none;
		}
	}
</style>

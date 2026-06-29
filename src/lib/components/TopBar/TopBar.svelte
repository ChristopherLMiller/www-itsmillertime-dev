<script lang="ts">
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
	import { navStore, type NavState } from '../../../stores/navigation';
	import { filterNavItems } from '$lib/components/navigation/visibility';

	type MenuLink = {
		title: string;
		href: string;
		external?: boolean;
	};

	let user = $derived(page.data.session?.user ?? null);
	let isLoggedIn = $derived(!!user);
	let isAdmin = $derived(isLoggedIn && (user?.role as string[] | undefined)?.includes('admin'));
	let visibleNavItems = $derived(filterNavItems(page.data.navigation.navItems, user));

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
				{ title: 'Sign Out', href: '/account/logout' }
			];
		}
		return [
			{ title: 'Login', href: '/account/login' },
			{ title: 'Sign Up', href: '/account/sign-up' }
		];
	});

	const appLinks = $derived.by((): MenuLink[] => {
		const links: MenuLink[] = [
			{ title: 'Storefront', href: storefrontUrl, external: true }
		];
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
		return [{ title: 'Content Manager', href: cmsAdminUrl, external: true }];
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

<div class="top-bar-element">
	<a class="top-bar-element__brand" href="/"><strong>I</strong>ts<strong>M</strong>iller<strong>T</strong>ime</a>

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
			aria-label="Site menu"
			onclick={handleDialogClick}
			onclose={handleDialogClose}
			oncancel={handleDialogClose}
		>
			<div class="menu-dialog__panel">
				<nav class="menu-dialog__nav">
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
					{/if}
				</nav>
			</div>
		</dialog>
	</div>
</div>

<style lang="postcss">
	.top-bar-element {
		--menu-tab-overhang: 0.5rem;

		background: var(--color-tertiary-darker);
		padding-inline: 1vw;
		position: sticky;
		width: 100%;
		height: var(--top-bar-height);
		offset: 0;
		top: 0;
		z-index: 9999;
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
	}

	.menu-dialog::backdrop {
		background: rgba(0, 0, 0, 0.35);
	}

	.menu-dialog__panel {
		width: min(26rem, calc(100vw - 2rem));
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
		padding: 1.25rem 1.375rem;
		background: var(--color-white) var(--linen-paper);
		border: var(--border-width) solid var(--color-primary-darker);
		color: var(--color-tertiary-darker);
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		box-shadow: none;
		animation: menu-panel-in 180ms ease;

		@media screen and (min-width: var(--layout-nav-desktop-min)) {
			box-shadow: var(--box-shadow-elev-1);
		}
	}

	.menu-dialog__nav {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.menu-dialog__section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.menu-dialog__section-title {
		margin: 0;
		font-family: var(--font-oswald);
		font-size: var(--fs-xs);
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-primary-darker);
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
		padding: 0.5rem 0.25rem;
		border-radius: 2px;
		color: var(--color-tertiary-darker);
		font-family: var(--font-source-code-pro);
		font-size: var(--fs-xs);
		font-weight: 300;
		line-height: 1.35;
		text-decoration: none;
		transition:
			background 150ms ease,
			color 150ms ease;
	}

	.menu-dialog__link:hover,
	.menu-dialog__link--active {
		background: var(--color-secondary-lighter);
		color: var(--color-primary-darkest);
	}

	.menu-dialog__link-external {
		flex-shrink: 0;
		font-size: calc(var(--fs-xs) * 0.85);
		color: var(--color-tertiary);
	}

	.hide-on-desktop {
		@media screen and (min-width: var(--layout-nav-desktop-min)) {
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

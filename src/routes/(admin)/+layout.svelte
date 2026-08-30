<script lang="ts">
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
	import NavigationProgress from '$lib/components/NavigationProgress';
	import { navStore } from '../../stores/navigation';
	import type { LayoutProps } from './$types';
	import '../../styles/reset.css';
	import './admin.css';

	let { data, children }: LayoutProps = $props();

	type NavLink = { href: string; title: string; external?: boolean };
	type NavGroup = { label: string; tone: 'primary' | 'quiet'; items: NavLink[] };

	const cms = `${PUBLIC_PAYLOAD_URL}/admin`;

	const navGroups: NavGroup[] = [
		{
			label: 'Settings',
			tone: 'primary',
			items: [
				{ href: '/admin/settings/ai', title: 'AI' },
				{ href: '/admin/settings/email', title: 'Email' },
				{ href: '/admin/settings/lastfm', title: 'Last.fm' }
			]
		},
		{
			label: 'Tools',
			tone: 'primary',
			items: [
				{ href: '/admin/cache', title: 'Cache' },
				{ href: '/admin/email-preview', title: 'Email preview' }
			]
		},
		{
			label: 'CMS',
			tone: 'quiet',
			items: [
				{ href: cms, title: 'Payload', external: true },
				{ href: `${cms}/collections/posts`, title: 'Posts', external: true },
				{ href: `${cms}/collections/pages`, title: 'Pages', external: true },
				{ href: `${cms}/collections/media`, title: 'Media', external: true },
				{ href: `${cms}/collections/gallery-albums`, title: 'Gallery albums', external: true },
				{ href: `${cms}/collections/gallery-images`, title: 'Gallery images', external: true },
				{ href: `${cms}/collections/users`, title: 'Users', external: true }
			]
		},
		{
			label: 'Apps',
			tone: 'quiet',
			items: [
				{
					href: env.PUBLIC_STOREFRONT_URL || 'https://store.itsmillertime.dev',
					title: 'Storefront',
					external: true
				},
				{
					href: env.PUBLIC_MEDUSA_ADMIN_URL || 'https://medusa.itsmillertime.dev/app',
					title: 'Medusa',
					external: true
				},
				{
					href: env.PUBLIC_COOLIFY_URL || 'https://coolify.itsmillertime.dev',
					title: 'Coolify',
					external: true
				},
				{
					href: env.PUBLIC_PLAUSIBLE_URL || 'https://analytics.itsmillertime.dev',
					title: 'Plausible',
					external: true
				}
			]
		}
	];

	const userLabel = $derived(
		typeof data.session?.user?.displayName === 'string' && data.session.user.displayName
			? data.session.user.displayName
			: typeof data.session?.user?.email === 'string'
				? data.session.user.email
				: 'Admin'
	);

	function isActive(href: string): boolean {
		return page.url.pathname === href;
	}

	function leaveAdmin() {
		navStore.close();
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="admin-shell">
	<NavigationProgress />
	<header class="admin-header">
		<a class="admin-header__home" href="/admin/settings/ai">Admin</a>
		<div class="admin-header__end">
			<span class="admin-header__user">{userLabel}</span>
			<a class="admin-header__site" href={data.siteHref ?? '/'} onclick={leaveAdmin}>Back to site</a>
			<a class="admin-header__link" href="/account/logout" data-sveltekit-reload>Sign out</a>
		</div>
	</header>
	<div class="admin-body">
		<aside class="admin-sidebar">
			<nav class="admin-sidebar__nav" aria-label="Admin">
				{#each navGroups as group (group.label)}
					<section
						class="admin-sidebar__group"
						class:admin-sidebar__group--quiet={group.tone === 'quiet'}
					>
						<p class="admin-sidebar__label">{group.label}</p>
						<ul class="admin-sidebar__list">
							{#each group.items as item (item.href)}
								<li>
									{#if item.external}
										<a
											class="admin-sidebar__link"
											href={item.href}
											target="_blank"
											rel="noopener noreferrer"
										>
											{item.title}
											<span class="admin-sidebar__ext" aria-hidden="true">↗</span>
										</a>
									{:else}
										<a
											class="admin-sidebar__link"
											class:admin-sidebar__link--active={isActive(item.href)}
											href={item.href}
											aria-current={isActive(item.href) ? 'page' : undefined}
										>
											{item.title}
										</a>
									{/if}
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</nav>
		</aside>
		<main class="admin-main">
			{@render children?.()}
		</main>
	</div>
</div>

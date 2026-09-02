<script lang="ts">
	import { page } from '$app/state';

	const tabs = [
		{ href: '/account/profile', label: 'Profile', exact: true },
		{ href: '/account/profile/content', label: 'My Content' },
		{ href: '/account/profile/shop', label: 'Shop' },
		{ href: '/account/profile/security', label: 'Security' }
	];

	const path = $derived(page.url.pathname);

	function isCurrent(href: string, exact: boolean | undefined) {
		if (exact) return path === href;
		return path === href || path.startsWith(`${href}/`);
	}
</script>

<nav class="account-tabs" aria-label="Account">
	{#each tabs as tab (tab.href)}
		<a href={tab.href} aria-current={isCurrent(tab.href, tab.exact) ? 'page' : undefined}>
			{tab.label}
		</a>
	{/each}
</nav>

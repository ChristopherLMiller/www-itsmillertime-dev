<script lang="ts">
	import { page } from '$app/state';

	let meta = $derived({
		...page.data.meta
	});

	function generateTitle(title: string) {
		if (meta.title) {
			return meta.title;
		}
		// Home path will match all and return something random, make it deterministic
		if (page.url.pathname === '/') {
			return `${page.data.siteMeta.siteMeta.find((pageMeta: { title: string }) => pageMeta?.title.toLowerCase().includes('home')).title} | ItsMillerTime`;
		}

		// Check if there is a site meta object for the path
		const pageMeta = page.data.siteMeta.siteMeta.find((pageMeta: { path: string }) =>
			pageMeta?.path.includes(page.url.pathname)
		);

		if (pageMeta) {
			return `${pageMeta?.title} | ItsMillerTime`;
		} else {
			return `${title} | ItsMillerTime`;
		}
	}

	function getImage(title: string) {
		if (meta.image) {
			if (meta.image.sizes['og']?.url) {
				return meta.image.sizes['og'].url;
			} else {
				return meta.image.url;
			}
		}

		// Generate dynamic OG image with title
		const titleParts = generateTitle(title).split(' | ');
		const encodedTitle = encodeURIComponent(titleParts[0]);
		return `${page.url.origin}/og-image?text=${encodedTitle}`;
	}

	function generateDescription(description: string) {

		if (meta.description) {
			return meta.description;
		}
		// Home path will match all and return something random, make it deterministic
		if (page.url.pathname === '/') {
			return `${page.data.siteMeta.siteMeta.find((pageMeta: { title: string }) => pageMeta?.title.toLowerCase().includes('home')).description} | ItsMillerTime`;
		}

		// Check if there is a site meta object for the path
		const pageMeta = page.data.siteMeta?.siteMeta?.find((pageMeta: { path: string }) =>
			pageMeta?.path.includes(page.url.pathname)
		);
		return pageMeta?.description || description;
	}

	let pageTitle = $derived(generateTitle(meta?.metaTitle));
	let pageDescription = $derived(generateDescription(meta?.metaDescription));
	let pageImage = $derived(meta?.metaImage?.url || getImage(meta?.title));
</script>

<svelte:head>

	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<meta name="image" property="og:image" content={pageImage} />
	{#if meta?.canonicalURL}
		<link rel="canonical" href={meta?.canonicalURL} />
	{/if}

	<!-- OG -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:image" content={pageImage} />
	<meta property="og:description" content={pageDescription} />
	{#if meta?.canonicalURL}
		<meta property="og:url" content={meta?.canonicalURL} />
	{/if}

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	<meta name="twitter:site" content="@itsmiller_time" />
	<meta name="twitter:image" content={pageImage} />
</svelte:head>

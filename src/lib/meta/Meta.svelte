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

	function getImage() {
		if (meta.image) {
			if (meta.image.sizes['og']?.url) {
				return meta.image.sizes['og'].url;
			} else {
				return meta.image.url;
			}
		}

		return 'https://cdn.itsmillertime.dev/6/default_cd50bfe553.jpg';
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
</script>

<svelte:head>
	<title>{generateTitle(meta?.metaTitle)}</title>
	<meta name="description" content={generateDescription(meta?.metaDescription)} />
	<meta name="image" property="og:image" content={meta?.metaImage?.url || getImage()} />
	{#if meta?.canonicalURL}
		<link rel="canonical" href={meta?.canonicalURL} />
	{/if}

	<!-- OG -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={generateTitle(meta?.metaTitle)} />
	<meta property="og:image" content={meta?.metaImage?.url || getImage()} />
	<meta property="og:description" content={generateDescription(meta?.metaDescription)} />
	{#if meta?.canonicalURL}
		<meta property="og:url" content={meta?.canonicalURL} />
	{/if}

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={generateTitle(meta?.metaTitle)} />
	<meta name="twitter:description" content={generateDescription(meta?.metaDescription)} />
	<meta name="twitter:site" content="@itsmiller_time" />
	<meta name="twitter:image" content={meta?.metaImage?.url || getImage()} />
</svelte:head>

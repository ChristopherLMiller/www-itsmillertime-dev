<script lang="ts">
	import Panel from '$lib/Panel.svelte';
	import ShareTargetForm from '$lib/components/ShareTargetForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const formKey = $derived(
		`${data.destination.mode}-${
			data.destination.mode === 'gallery-image' ? data.destination.albumId : 0
		}-${data.uploadSummary?.uploaded ?? 'u'}-${data.uploadSummary?.failed ?? 'f'}-${data.flashErrors.length}`
	);
</script>

<svelte:head>
	<title>Share to site | itsMillerTime.dev</title>
</svelte:head>

<div class="wrap">
	<Panel hasPadding={true} hasBorder={true}>
		<h1>Share from your phone</h1>
		<p class="lede">
			When this site is installed as an app, you can share photos from your gallery into Payload.
			Sign in on this device first, then pick where uploads go.
		</p>
		<p class="compat">
			<strong>Device support:</strong> Web Share Target is supported for installed PWAs in
			<strong>Chrome on Android</strong>. Safari-installed apps on iPhone and iPad do not appear in the
			system share sheet yet. After changing the manifest, remove the home-screen app and add it again so
			the OS picks up updates. When testing, share <strong>actual photos</strong> from your gallery app
			(image files); sharing only a link or plain text often will not list targets that accept images.
			Use <strong>Chrome's</strong> Install or Add to Home screen (other browsers may not register the same
			share target).
		</p>
		<p class="manifest-tip">
			<strong>Installed app vs browser tab:</strong> The manifest you open in a normal tab can be newer than
			the one baked into the installed PWA. Chrome for Android refreshes it on a schedule (often after you
			close the app, on Wi‑Fi, and sometimes while charging). To force it: open
			<code>about://webapks</code> in Chrome, find this app, tap <strong>Update</strong>, then follow the
			steps shown there—or uninstall the home-screen app and install it again (most reliable).
		</p>

		{#if !data.session?.user}
			<p class="warn">
				You are not signed in. <a href="/account/login">Sign in</a> before sharing images.
			</p>
		{/if}

		{#if data.uploadSummary}
			<div class="banner ok" role="status">
				Uploaded {data.uploadSummary.uploaded} file{data.uploadSummary.uploaded === 1 ? '' : 's'} to Payload.
				{#if data.uploadSummary.failed > 0}
					<span class="partial">
						{data.uploadSummary.failed} failed — see details below.
					</span>
				{/if}
			</div>
		{/if}

		{#if data.flashErrors.length > 0}
			<div class="banner err" role="alert">
				<ul>
					{#each data.flashErrors as line}
						<li>{line}</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#key formKey}
			<ShareTargetForm
				signedIn={Boolean(data.session?.user)}
				destination={data.destination}
				albums={data.albums}
			/>
		{/key}
	</Panel>
</div>

<style lang="postcss">
	.wrap {
		max-width: 42rem;
		margin: 0 auto;
		padding-block: 2rem;
		padding-inline: 1rem;
	}

	h1 {
		font-family: var(--font-permanent-marker);
		font-size: var(--fs-l);
		color: var(--color-primary);
		margin: 0 0 0.75rem;
	}

	.lede {
		font-family: var(--font-roboto);
		font-size: var(--fs-s);
		line-height: 1.5;
		margin: 0 0 1rem;
	}

	.compat {
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		line-height: 1.45;
		margin: 0 0 1rem;
		color: var(--color-text-muted, #444);
	}

	.manifest-tip {
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		line-height: 1.45;
		margin: 0 0 1rem;
		color: var(--color-text-muted, #444);
	}

	.manifest-tip code {
		font-size: 0.95em;
		word-break: break-all;
	}

	.warn {
		font-family: var(--font-roboto);
		font-size: var(--fs-s);
		color: var(--color-primary-darker);
		border: 1px solid var(--color-primary);
		padding: 0.75rem 1rem;
		border-radius: 4px;
		background: oklch(0.95 0.02 25);
	}

	.banner {
		padding: 0.75rem 1rem;
		border-radius: 4px;
		font-family: var(--font-roboto);
		font-size: var(--fs-s);
		margin-bottom: 1rem;
	}

	.banner.ok {
		background: oklch(0.94 0.03 145);
		border: 1px solid oklch(0.55 0.12 145);
	}

	.banner.err {
		background: oklch(0.95 0.04 25);
		border: 1px solid var(--color-primary);
	}

	.banner ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	.partial {
		display: block;
		margin-top: 0.35rem;
		font-size: var(--fs-xs);
	}
</style>

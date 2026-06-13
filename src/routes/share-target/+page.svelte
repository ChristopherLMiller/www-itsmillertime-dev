<script lang="ts">
	import Panel from '$lib/components/Panel';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Share to site | itsMillerTime.dev</title>
</svelte:head>

<div class="wrap">
	<Panel hasPadding={true} hasBorder={true}>
		<h1>Share from your phone</h1>
		<p class="lede">
			{#if data.canUseShareTarget}
				When this site is installed as an app, you can share a photo from your gallery. You will
				land on a short form to set the title and choose <strong>Media</strong> or a new
				<strong>gallery image</strong> before it uploads to Payload. Sign in on this device first.
			{:else if data.session?.user}
				Whoops — Share to site is only available to accounts with the <strong>admin</strong> role. Your
				account does not have access. Use the CMS or ask an administrator if you need to upload media.
			{:else}
				Share to site is only available after you sign in with an <strong>administrator</strong> account
				on this device. You will land on a short form to set the title and destination before the image
				uploads to Payload.
			{/if}
		</p>
		{#if data.canUseShareTarget}
			<p class="compat">
				<strong>Device support:</strong> Web Share Target is supported for installed PWAs in
				<strong>Chrome on Android</strong>. Safari-installed apps on iPhone and iPad do not appear
				in the system share sheet yet. After changing the manifest, remove the home-screen app and
				add it again so the OS picks up updates.
				<strong>Preview deployments:</strong> the manifest must use the same host as the app you install;
				if the share target vanished on a PR build, reinstall after deploy so Chrome picks up the fixed
				manifest.
			</p>
		{/if}

		{#if data.hasDraft}
			<p class="draft-banner" role="status">
				<a href="/share-target/review">Finish a shared photo</a>
				— an image is waiting on this device (expires in a few minutes).
			</p>
		{/if}

		{#if !data.session?.user}
			<p class="warn">
				You are not signed in. <a href="/account/login">Sign in</a> with an administrator account before
				sharing images.
			</p>
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

	.draft-banner {
		font-family: var(--font-roboto);
		font-size: var(--fs-s);
		padding: 0.75rem 1rem;
		border-radius: 4px;
		margin: 0 0 1rem;
		background: oklch(0.94 0.04 250);
		border: 1px solid oklch(0.55 0.12 250);
	}

	.draft-banner a {
		color: var(--color-primary);
		font-weight: 600;
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

	.banner.err {
		background: oklch(0.95 0.04 25);
		border: 1px solid var(--color-primary);
	}

	.banner ul {
		margin: 0;
		padding-left: 1.25rem;
	}
</style>

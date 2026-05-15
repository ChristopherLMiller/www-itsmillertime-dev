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

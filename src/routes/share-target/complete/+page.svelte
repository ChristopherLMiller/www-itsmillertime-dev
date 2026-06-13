<script lang="ts">
	import Panel from '$lib/components/Panel';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let copied = $state<string | null>(null);

	async function copyText(text: string, key: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = key;
			setTimeout(() => {
				copied = null;
			}, 2000);
		} catch {
			copied = 'error';
			setTimeout(() => {
				copied = null;
			}, 2500);
		}
	}
</script>

<svelte:head>
	<title>Uploaded | Share to site</title>
</svelte:head>

<div class="wrap">
	<Panel hasPadding={true} hasBorder={true}>
		<h1>Uploaded</h1>
		<p class="lede">
			{data.kind === 'media' ? 'Media' : 'Gallery image'} #{data.id} — {data.alt}
		</p>

		{#if data.previewUrl}
			<div class="preview">
				<img src={data.previewUrl} alt={data.alt} />
			</div>
		{/if}

		<div class="links">
			{#if data.directFileUrl}
				<div class="row">
					<label class="lbl" for="direct-url">Direct image URL</label>
					<div class="copyrow">
						<input id="direct-url" class="input" type="text" readonly value={data.directFileUrl} />
						<button
							type="button"
							class="copybtn"
							onclick={() => copyText(data.directFileUrl, 'direct')}
						>
							{copied === 'direct' ? 'Copied' : 'Copy'}
						</button>
					</div>
				</div>
			{/if}

			{#if data.galleryPageUrl}
				<div class="row">
					<label class="lbl" for="gallery-url">Gallery page</label>
					<div class="copyrow">
						<input
							id="gallery-url"
							class="input"
							type="text"
							readonly
							value={data.galleryPageUrl}
						/>
						<button
							type="button"
							class="copybtn"
							onclick={() => copyText(data.galleryPageUrl!, 'gallery')}
						>
							{copied === 'gallery' ? 'Copied' : 'Copy'}
						</button>
					</div>
					<a class="open" href={data.galleryPageUrl}>Open gallery</a>
				</div>
			{/if}
		</div>

		{#if copied === 'error'}
			<p class="err" role="status">Clipboard was blocked — select the field and copy manually.</p>
		{/if}

		<p class="footer">
			<a href="/share-target">Share again</a>
			·
			<a href="/">Home</a>
		</p>
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
		margin: 0 0 1.25rem;
		color: var(--color-tertiary-darkest);
	}

	.preview {
		border-radius: 6px;
		overflow: hidden;
		border: 2px solid var(--color-tertiary-lighter);
		margin-bottom: 1.5rem;
		max-height: 22rem;
		background: var(--color-white-lightest);
	}

	.preview img {
		display: block;
		width: 100%;
		height: auto;
		max-height: 22rem;
		object-fit: contain;
	}

	.links {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.row {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.lbl {
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		color: var(--color-tertiary-darker);
	}

	.copyrow {
		display: flex;
		gap: 0.5rem;
		align-items: stretch;
	}

	.input {
		flex: 1;
		min-width: 0;
		font-family: var(--font-source-code-pro);
		font-size: var(--fs-xs);
		padding: 0.5rem 0.65rem;
		border: 2px solid var(--color-tertiary-lighter);
		border-radius: 4px;
		background: var(--color-white-lightest);
		color: var(--color-tertiary-darkest);
	}

	.copybtn {
		flex-shrink: 0;
		padding: 0.5rem 0.85rem;
		border: 2px solid var(--color-primary);
		border-radius: 4px;
		background: var(--color-primary);
		color: var(--color-white-lightest);
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		cursor: pointer;
	}

	.open {
		font-family: var(--font-roboto);
		font-size: var(--fs-s);
		color: var(--color-primary);
	}

	.err {
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		color: var(--color-primary-darker);
		margin: 1rem 0 0;
	}

	.footer {
		font-family: var(--font-roboto);
		font-size: var(--fs-s);
		margin: 1.5rem 0 0;
	}

	.footer a {
		color: var(--color-primary);
	}
</style>

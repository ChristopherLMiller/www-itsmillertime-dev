<script lang="ts">
	import { enhance } from '$app/forms';
	import Panel from '$lib/Panel.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let alt = $state('');
	let mode = $state<'media' | 'gallery-image'>('media');
	let submitting = $state(false);

	const destSig = $derived(`${data.destination.mode}-${data.suggestedAlt}`);

	let lastSynced = $state<string | null>(null);

	$effect.pre(() => {
		if (!data.draft || !data.session?.user) return;
		if (lastSynced === destSig) return;
		lastSynced = destSig;
		alt = data.suggestedAlt;
		mode = data.destination.mode === 'gallery-image' ? 'gallery-image' : 'media';
	});
</script>

<svelte:head>
	<title>Finish upload | Share to site</title>
</svelte:head>

<div class="wrap">
	<Panel hasPadding={true} hasBorder={true}>
		{#if !data.session?.user}
			<h1>Sign in to continue</h1>
			<p class="lede">
				You need an active session to finish this upload. Your shared image is held briefly on the
				server.
			</p>
			<p class="actions">
				<a class="btn" href="/account/login">Sign in</a>
				<a class="btn secondary" href="/share-target">Back</a>
			</p>
		{:else if data.draft}
			<h1>Finish upload</h1>
			<p class="lede">
				Confirm the title and whether this file goes to <strong>Media</strong> or a new
				<strong>gallery image</strong>, then upload to the CMS.
			</p>

			{#if data.draft.extraImagesDropped > 0}
				<p class="note">
					Only the first image was kept ({data.draft.extraImagesDropped} other
					{data.draft.extraImagesDropped === 1 ? 'image was' : 'images were'} skipped).
				</p>
			{/if}

			{#if form?.error}
				<p class="errbanner" role="alert">{form.error}</p>
			{/if}

			<div class="layout">
				<div class="preview">
					<img src="/api/share-target/draft" alt="Shared preview" width="320" height="320" />
				</div>

				<form
					class="fields"
					method="POST"
					action="?/upload"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							await update();
							submitting = false;
						};
					}}
				>
					<label class="field">
						<span>Title / alt text</span>
						<input
							class="input"
							name="alt"
							type="text"
							maxlength="500"
							required
							bind:value={alt}
							disabled={submitting}
							autocomplete="off"
						/>
					</label>

					<fieldset class="fieldset">
						<legend>Destination</legend>
						<label class="radio-line">
							<input
								type="radio"
								name="destinationMode"
								value="media"
								bind:group={mode}
								disabled={submitting}
							/>
							Media library
						</label>
						<label class="radio-line">
							<input
								type="radio"
								name="destinationMode"
								value="gallery-image"
								bind:group={mode}
								disabled={submitting}
							/>
							Gallery image
						</label>
					</fieldset>

					<button type="submit" class="submit" disabled={submitting}>
						{submitting ? 'Uploading…' : 'Upload to Payload'}
					</button>
				</form>
			</div>
		{/if}
	</Panel>
</div>

<style lang="postcss">
	.wrap {
		max-width: 46rem;
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
		color: var(--color-tertiary-darkest);
	}

	.note {
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		margin: 0 0 1rem;
	}

	.errbanner {
		font-family: var(--font-roboto);
		font-size: var(--fs-s);
		color: var(--color-primary-darker);
		background: oklch(0.95 0.04 25);
		border: 1px solid var(--color-primary);
		padding: 0.65rem 1rem;
		border-radius: 4px;
		margin: 0 0 1rem;
	}

	.layout {
		display: grid;
		gap: 1.5rem;
		align-items: start;
	}

	@media (min-width: 40rem) {
		.layout {
			grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
		}
	}

	.preview {
		border-radius: 6px;
		overflow: hidden;
		border: 2px solid var(--color-tertiary-lighter);
		background: var(--color-white-lightest);
	}

	.preview img {
		display: block;
		width: 100%;
		height: auto;
		max-height: 20rem;
		object-fit: contain;
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		color: var(--color-tertiary-darker);
	}

	.fieldset {
		border: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.fieldset legend {
		font-family: var(--font-special-elite);
		font-size: var(--fs-base);
		color: var(--color-tertiary-darkest);
		margin-bottom: 0.25rem;
	}

	.radio-line {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-roboto);
		font-size: var(--fs-s);
		cursor: pointer;
	}

	.input {
		font-family: var(--font-roboto);
		font-size: var(--fs-s);
		padding: 0.5rem 0.65rem;
		border: 2px solid var(--color-tertiary-lighter);
		border-radius: 4px;
		background: var(--color-white-lightest);
		color: var(--color-tertiary-darkest);
	}

	.submit {
		margin-top: 0.25rem;
		padding: 0.65rem 1.25rem;
		border: 2px solid var(--color-primary);
		border-radius: 4px;
		background: var(--color-primary);
		color: var(--color-white-lightest);
		font-family: var(--font-roboto);
		font-size: var(--fs-s);
		cursor: pointer;
		align-self: flex-start;
	}

	.submit:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.btn {
		display: inline-block;
		padding: 0.6rem 1.25rem;
		border: 2px solid var(--color-primary);
		border-radius: 4px;
		background: var(--color-primary);
		color: var(--color-white-lightest);
		font-family: var(--font-roboto);
		font-size: var(--fs-s);
		text-decoration: none;
	}

	.btn.secondary {
		background: transparent;
		color: var(--color-primary);
	}
</style>

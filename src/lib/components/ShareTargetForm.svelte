<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { ShareTargetDestination } from '$lib/share-target-destination';

	let {
		signedIn,
		destination
	}: {
		signedIn: boolean;
		destination: ShareTargetDestination;
	} = $props();

	let mode = $state<'media' | 'gallery-image'>('media');
	let saving = $state(false);
	let saveMessage = $state<string | null>(null);
	let saveError = $state<string | null>(null);

	const destSig = $derived(`${destination.mode}`);

	let lastSyncedSig = $state<string | null>(null);

	$effect.pre(() => {
		if (lastSyncedSig === destSig) return;
		lastSyncedSig = destSig;
		mode = destination.mode === 'media' ? 'media' : 'gallery-image';
	});

	async function saveDestination() {
		saveMessage = null;
		saveError = null;
		saving = true;
		try {
			const body =
				mode === 'media' ? { mode: 'media' as const } : { mode: 'gallery-image' as const };
			const res = await fetch('/api/share-target/destination', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
				credentials: 'include'
			});
			const json = (await res.json().catch(() => null)) as {
				error?: string;
				destination?: ShareTargetDestination;
			} | null;
			if (!res.ok) {
				saveError = json?.error ?? 'Could not save preference.';
				return;
			}
			saveMessage = 'Saved. Shares will use this destination until you change it.';
			if (json?.destination) {
				mode = json.destination.mode === 'media' ? 'media' : 'gallery-image';
			}
			await invalidateAll();
		} catch {
			saveError = 'Network error while saving.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="form-block">
	<h2>Destination</h2>
	<p class="hint">
		<strong>Media</strong> uploads to the media library. <strong>Gallery image</strong> creates a new
		gallery image you can organize later in the CMS.
	</p>

	<div class="controls">
		<label class="radio-line">
			<input type="radio" bind:group={mode} name="dest" value="media" disabled={!signedIn} />
			Media library
		</label>
		<label class="radio-line">
			<input
				type="radio"
				bind:group={mode}
				name="dest"
				value="gallery-image"
				disabled={!signedIn}
			/>
			Gallery image
		</label>

		<button type="button" class="save" onclick={saveDestination} disabled={saving || !signedIn}>
			{saving ? 'Saving…' : 'Save destination'}
		</button>
		{#if saveMessage}
			<p class="okmsg" role="status">{saveMessage}</p>
		{/if}
		{#if saveError}
			<p class="errmsg" role="alert">{saveError}</p>
		{/if}
	</div>
</div>

<style lang="postcss">
	h2 {
		font-family: var(--font-special-elite);
		font-size: var(--fs-base);
		color: var(--color-tertiary-darkest);
		margin: 0 0 0.5rem;
	}

	.hint {
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		line-height: 1.45;
		margin: 0 0 1rem;
	}

	.form-block {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.radio-line {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-roboto);
		font-size: var(--fs-s);
		cursor: pointer;
	}

	.save {
		margin-top: 0.5rem;
		padding: 0.6rem 1.25rem;
		border: 2px solid var(--color-primary);
		border-radius: 4px;
		background: var(--color-primary);
		color: var(--color-white-lightest);
		font-family: var(--font-roboto);
		font-size: var(--fs-s);
		cursor: pointer;
	}

	.save:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.okmsg {
		color: oklch(0.35 0.12 145);
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		margin: 0;
	}

	.errmsg {
		color: var(--color-primary-darker);
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		margin: 0;
	}
</style>

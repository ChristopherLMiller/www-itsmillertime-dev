<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { ShareTargetDestination } from '$lib/share-target-destination';
	import type { GalleryAlbum } from '$lib/types/payload-types';

	type AlbumRow = Pick<GalleryAlbum, 'id' | 'title' | 'slug'>;

	let { signedIn, destination, albums } = $props();

	let mode = $state<'media' | 'gallery-image'>('media');
	let albumId = $state('');
	let saving = $state(false);
	let saveMessage = $state<string | null>(null);
	let saveError = $state<string | null>(null);

	const destSig = $derived(
		`${destination.mode}-${destination.mode === 'gallery-image' ? destination.albumId : ''}`
	);

	let lastSyncedSig = $state<string | null>(null);

	$effect.pre(() => {
		if (lastSyncedSig === destSig) return;
		lastSyncedSig = destSig;
		mode = destination.mode === 'media' ? 'media' : 'gallery-image';
		albumId = destination.mode === 'gallery-image' ? String(destination.albumId) : '';
	});

	async function saveDestination() {
		saveMessage = null;
		saveError = null;
		if (mode === 'gallery-image') {
			const id = Number.parseInt(albumId, 10);
			if (!Number.isFinite(id) || id <= 0) {
				saveError = 'Choose an album (or enter a valid album ID).';
				return;
			}
		}
		saving = true;
		try {
			const body =
				mode === 'media'
					? { mode: 'media' as const }
					: { mode: 'gallery-image' as const, albumId: Number.parseInt(albumId, 10) };
			const res = await fetch('/api/share-target/destination', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
				credentials: 'include'
			});
			const json = (await res.json().catch(() => null)) as
				| { error?: string; destination?: ShareTargetDestination }
				| null;
			if (!res.ok) {
				saveError = json?.error ?? 'Could not save preference.';
				return;
			}
			saveMessage = 'Saved. Shares will use this destination until you change it.';
			if (json?.destination) {
				if (json.destination.mode === 'media') {
					mode = 'media';
					albumId = '';
				} else {
					mode = 'gallery-image';
					albumId = String(json.destination.albumId);
				}
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
		<strong>Media</strong> uploads to the media library. <strong>Gallery album</strong> creates
		<strong>gallery image</strong> rows linked to the album you choose (the album document itself is not
		replaced).
	</p>

	<div class="controls">
		<label class="radio-line">
			<input type="radio" bind:group={mode} name="dest" value="media" disabled={!signedIn} />
			Media library
		</label>
		<label class="radio-line">
			<input type="radio" bind:group={mode} name="dest" value="gallery-image" disabled={!signedIn} />
			Gallery album (new gallery images)
		</label>

		{#if mode === 'gallery-image'}
			{#if albums.length > 0}
				<label class="field">
					<span>Album</span>
					<select bind:value={albumId} class="select" disabled={!signedIn}>
						<option value="" disabled>Choose an album…</option>
						{#each albums as a}
							<option value={String(a.id)}>{a.title} (id {a.id})</option>
						{/each}
					</select>
				</label>
			{:else}
				<label class="field">
					<span>Album ID</span>
					<input
						type="number"
						min="1"
						step="1"
						bind:value={albumId}
						class="input"
						placeholder="Numeric album id"
						disabled={!signedIn}
					/>
				</label>
				<p class="hint small">No albums were returned; enter an ID if you know one.</p>
			{/if}
		{/if}

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

	.hint.small {
		margin-top: 0.25rem;
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

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		width: 100%;
		max-width: 24rem;
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		color: var(--color-tertiary-darker);
	}

	.select,
	.input {
		font-family: var(--font-roboto);
		font-size: var(--fs-s);
		padding: 0.5rem 0.65rem;
		border: 2px solid var(--color-tertiary-lighter);
		border-radius: 4px;
		background: var(--color-white-lightest);
		color: var(--color-tertiary-darkest);
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

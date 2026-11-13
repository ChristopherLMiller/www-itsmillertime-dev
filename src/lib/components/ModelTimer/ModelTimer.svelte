<script module lang="ts">
	import type { Model } from '$lib/types/payload-types';

	export type ModelStatus = Model['model_meta']['status'];
	export type ModelTimerChange = { totalSeconds: number; status: ModelStatus | null };
</script>

<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon';
	import { onMount } from 'svelte';
	import { createSubscriber } from 'svelte/reactivity';

	/** Running entry as returned by the CMS `GET /api/model-time/timer` endpoint. */
	type RunningEntry = {
		id: number;
		modelId: number | string | null;
		modelTitle: string | null;
		startedAt: string | null;
	};

	type TimerStatusResponse = {
		isRunning: boolean;
		entry: RunningEntry | null;
		model?: { id: number; totalSeconds: number; status: ModelStatus | null };
	};

	type ModelTimerProps = {
		modelId: number;
		/** Called after a successful start/stop with the model's fresh total and status. */
		onChange?: (change: ModelTimerChange) => void;
	};

	const { modelId, onChange }: ModelTimerProps = $props();

	const TIMER_URL = '/api/model-time/timer';

	const isAdmin = $derived(
		!!page.data.session?.user &&
			(page.data.session?.user?.role as string[] | undefined)?.includes('admin')
	);

	let status = $state<TimerStatusResponse | null>(null);
	let loading = $state(true);
	let busy = $state(false);
	let errorMessage = $state<string | null>(null);

	const subscribeToSecond = createSubscriber((update) => {
		const id = setInterval(update, 1000);
		return () => clearInterval(id);
	});

	const activeEntry = $derived(status?.isRunning ? status.entry : null);
	const isRunningOnThisModel = $derived(
		activeEntry != null && Number(activeEntry.modelId) === modelId
	);
	const elapsedLabel = $derived.by(() => {
		const start = activeEntry?.startedAt;
		if (!isRunningOnThisModel || !start) return null;
		subscribeToSecond();
		const startMs = Date.parse(start);
		if (Number.isNaN(startMs)) return null;
		return formatElapsed(Math.max(0, Date.now() - startMs));
	});

	function formatElapsed(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		if (hours > 0) {
			return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
		}
		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}

	async function readError(response: Response): Promise<string> {
		try {
			const data = (await response.json()) as { error?: string; message?: string };
			return data.error || data.message || `Request failed (${response.status})`;
		} catch {
			return `Request failed (${response.status})`;
		}
	}

	async function refreshStatus(): Promise<TimerStatusResponse | null> {
		const response = await fetch(`${TIMER_URL}?modelId=${modelId}`);
		if (!response.ok) {
			errorMessage = await readError(response);
			status = null;
			return null;
		}
		status = (await response.json()) as TimerStatusResponse;
		return status;
	}

	async function send(path: 'start' | 'stop') {
		if (busy) return;
		busy = true;
		errorMessage = null;
		try {
			const response = await fetch(`${TIMER_URL}/${path}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(path === 'start' ? { modelId } : {})
			});
			if (!response.ok) {
				errorMessage = await readError(response);
				return;
			}
			const fresh = await refreshStatus();
			if (fresh?.model) {
				onChange?.({ totalSeconds: fresh.model.totalSeconds, status: fresh.model.status });
			}
		} catch {
			errorMessage = 'Could not reach the server. Try again.';
		} finally {
			busy = false;
		}
	}

	onMount(() => {
		if (!isAdmin) return;

		let cancelled = false;

		(async () => {
			loading = true;
			try {
				await refreshStatus();
			} catch {
				if (!cancelled) errorMessage = 'Could not load the timer.';
			} finally {
				if (!cancelled) loading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});
</script>

{#if isAdmin}
	<div class="model-timer">
		{#if loading}
			<span class="timer-status" aria-live="polite">Checking timer…</span>
		{:else if isRunningOnThisModel}
			<span class="timer-status running-status" aria-live="polite">
				<span class="pulse" aria-hidden="true"></span>
				<span>{elapsedLabel ?? 'Running'}</span>
			</span>
			<button
				type="button"
				class="timer-button stop"
				onclick={() => send('stop')}
				disabled={busy}
				aria-label="Stop the timer for this model"
			>
				<Icon name="square" size={14} />
				<span>{busy ? 'Stopping…' : 'Stop'}</span>
			</button>
		{:else if activeEntry}
			<span class="timer-status other-status" aria-live="polite">
				Running on {activeEntry.modelTitle ?? 'another model'}
			</span>
			<button
				type="button"
				class="timer-button stop"
				onclick={() => send('stop')}
				disabled={busy}
				aria-label={`Stop the timer running on ${activeEntry.modelTitle ?? 'another model'}`}
			>
				<Icon name="square" size={14} />
				<span>{busy ? 'Stopping…' : 'Stop'}</span>
			</button>
			<button
				type="button"
				class="timer-button start"
				onclick={() => send('start')}
				disabled={busy}
				aria-label="Stop the other timer and start one for this model"
			>
				<Icon name="play" size={14} />
				<span>{busy ? 'Switching…' : 'Switch here'}</span>
			</button>
		{:else}
			<button
				type="button"
				class="timer-button start"
				onclick={() => send('start')}
				disabled={busy}
				aria-label="Start a timer for this model"
			>
				<Icon name="play" size={14} />
				<span>{busy ? 'Starting…' : 'Start timer'}</span>
			</button>
		{/if}

		{#if errorMessage}
			<span class="timer-error" role="alert">{errorMessage}</span>
		{/if}
	</div>
{/if}

<style lang="postcss">
	.model-timer {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-family: var(--font-oswald);
		font-size: var(--fs-xs);
		color: var(--color-primary-darker);
	}

	.timer-status {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.running-status {
		color: var(--color-secondary);
		font-weight: 600;
	}

	.other-status {
		color: var(--color-tertiary);
	}

	.pulse {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--color-secondary);
		animation: pulse 1.4s ease-in-out infinite;
	}

	.timer-button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.7rem;
		border: 1px solid var(--color-primary-darker);
		background: color-mix(in srgb, var(--color-white) 85%, transparent);
		color: var(--color-primary-darker);
		font-family: var(--font-oswald);
		font-size: var(--fs-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;

		&:hover:not(:disabled) {
			background: var(--color-primary-darker);
			color: var(--color-white);
		}

		&:disabled {
			opacity: 0.6;
			cursor: wait;
		}

		&.stop {
			border-color: var(--color-secondary);
			color: var(--color-secondary);

			&:hover:not(:disabled) {
				background: var(--color-secondary);
				color: var(--color-white);
			}
		}
	}

	.timer-error {
		flex-basis: 100%;
		color: var(--color-secondary);
		letter-spacing: 0.02em;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.45;
			transform: scale(0.85);
		}
	}
</style>

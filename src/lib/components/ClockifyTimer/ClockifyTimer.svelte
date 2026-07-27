<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon';
	import { onMount } from 'svelte';
	import { createSubscriber } from 'svelte/reactivity';

	type ClockifyTimerEntry = {
		id?: string;
		description?: string | null;
		projectId?: string | null;
		timeInterval?: {
			start?: string | null;
			end?: string | null;
			duration?: string | null;
		} | null;
	};

	type ClockifyTimerStatus = {
		isRunning: boolean;
		timer: ClockifyTimerEntry | null;
		timers?: ClockifyTimerEntry[];
	};

	type ClockifyTimerProps = {
		projectId: string;
		description?: string;
		/** Called after a successful start/stop so parents can refresh totals. */
		onChange?: () => void;
	};

	const { projectId, description, onChange }: ClockifyTimerProps = $props();

	const isAdmin = $derived(
		!!page.data.session?.user &&
			(page.data.session?.user?.role as string[] | undefined)?.includes('admin')
	);

	let status = $state<ClockifyTimerStatus | null>(null);
	let loading = $state(true);
	let busy = $state(false);
	let errorMessage = $state<string | null>(null);

	const subscribeToSecond = createSubscriber((update) => {
		const id = setInterval(update, 1000);
		return () => clearInterval(id);
	});

	const activeTimer = $derived(status?.timer ?? status?.timers?.[0] ?? null);
	const isRunning = $derived(Boolean(status?.isRunning && activeTimer));
	const isRunningOnThisProject = $derived(
		isRunning && activeTimer?.projectId != null && activeTimer.projectId === projectId
	);
	const elapsedLabel = $derived.by(() => {
		const start = activeTimer?.timeInterval?.start;
		if (!isRunning || !start) return null;
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

	async function refreshStatus() {
		errorMessage = null;
		const response = await fetch('/api/clockify/timer');
		if (!response.ok) {
			errorMessage = await readError(response);
			status = null;
			return;
		}
		status = (await response.json()) as ClockifyTimerStatus;
	}

	async function startTimer() {
		if (busy) return;
		busy = true;
		errorMessage = null;
		try {
			const response = await fetch('/api/clockify/timer/start', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					projectId,
					...(description ? { description } : {})
				})
			});
			if (!response.ok) {
				errorMessage = await readError(response);
				return;
			}
			await refreshStatus();
			onChange?.();
		} finally {
			busy = false;
		}
	}

	async function stopTimer() {
		if (busy) return;
		busy = true;
		errorMessage = null;
		try {
			const response = await fetch('/api/clockify/timer/stop', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({})
			});
			if (!response.ok) {
				errorMessage = await readError(response);
				return;
			}
			await refreshStatus();
			onChange?.();
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
	<div class="clockify-timer">
		{#if loading}
			<span class="timer-status" aria-live="polite">Checking timer…</span>
		{:else if isRunningOnThisProject}
			<span class="timer-status running-status" aria-live="polite">
				<span class="pulse" aria-hidden="true"></span>
				{#if elapsedLabel}
					<span>{elapsedLabel}</span>
				{:else}
					<span>Running</span>
				{/if}
			</span>
			<button
				type="button"
				class="timer-button stop"
				onclick={stopTimer}
				disabled={busy}
				aria-label="Stop Clockify timer"
			>
				<Icon name="square" size={14} />
				<span>{busy ? 'Stopping…' : 'Stop'}</span>
			</button>
		{:else if isRunning}
			<span class="timer-status other-status" aria-live="polite">Timer on another project</span>
			<button
				type="button"
				class="timer-button stop"
				onclick={stopTimer}
				disabled={busy}
				aria-label="Stop Clockify timer on another project"
			>
				<Icon name="square" size={14} />
				<span>{busy ? 'Stopping…' : 'Stop'}</span>
			</button>
		{:else}
			<button
				type="button"
				class="timer-button start"
				onclick={startTimer}
				disabled={busy}
				aria-label="Start Clockify timer for this model"
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
	.clockify-timer {
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

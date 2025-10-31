<script lang="ts">
	interface Props {
		text?: string;
		size?: 'small' | 'medium' | 'large';
		variant?: 'dots' | 'spinner' | 'pulse';
	}

	let { text = 'Loading...', size = 'medium', variant = 'dots' } = $props<Props>();
</script>

<div class="loading-indicator {size} {variant}">
	{#if variant === 'dots'}
		<div class="dots-container">
			<div class="dot"></div>
			<div class="dot"></div>
			<div class="dot"></div>
		</div>
	{:else if variant === 'spinner'}
		<div class="spinner"></div>
	{:else if variant === 'pulse'}
		<div class="pulse"></div>
	{/if}

	{#if text}
		<p class="loading-text">{text}</p>
	{/if}
</div>

<style lang="postcss">
	.loading-indicator {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 2rem;
		min-height: 200px;
	}

	.loading-text {
		color: var(--color-white);
		font-family: var(--font-source-code-pro);
		font-size: var(--fs-base);
		font-weight: 300;
		margin: 0;
		text-align: center;
	}

	/* Dots Animation */
	.dots-container {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background-color: var(--color-primary);
		animation: dot-bounce 1.4s ease-in-out infinite both;
	}

	.dot:nth-child(1) {
		animation-delay: -0.32s;
	}

	.dot:nth-child(2) {
		animation-delay: -0.16s;
	}

	.dot:nth-child(3) {
		animation-delay: 0s;
	}

	@keyframes dot-bounce {
		0%,
		80%,
		100% {
			transform: scale(0);
			opacity: 0.5;
		}
		40% {
			transform: scale(1);
			opacity: 1;
		}
	}

	/* Spinner Animation */
	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--color-tertiary-darker);
		border-top: 3px solid var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	/* Pulse Animation */
	.pulse {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background-color: var(--color-primary);
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0% {
			transform: scale(0.8);
			opacity: 0.5;
		}
		50% {
			transform: scale(1.2);
			opacity: 1;
		}
		100% {
			transform: scale(0.8);
			opacity: 0.5;
		}
	}

	/* Size variants */
	.small .dot {
		width: 8px;
		height: 8px;
	}

	.small .spinner {
		width: 24px;
		height: 24px;
		border-width: 2px;
	}

	.small .pulse {
		width: 24px;
		height: 24px;
	}

	.small .loading-text {
		font-size: var(--fs-xs);
	}

	.large .dot {
		width: 16px;
		height: 16px;
	}

	.large .spinner {
		width: 60px;
		height: 60px;
		border-width: 4px;
	}

	.large .pulse {
		width: 60px;
		height: 60px;
	}

	.large .loading-text {
		font-size: var(--fs-s);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.loading-indicator {
			padding: 1rem;
			min-height: 150px;
		}
	}
</style>

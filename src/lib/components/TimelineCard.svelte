<script lang="ts">
	import Lexical from '$lib/Lexical.svelte';
	import { slide } from 'svelte/transition';

	type TimelineCardProps = {
		title: string;
		content: any;
		isLast?: boolean;
	};

	const { title, content, isLast = false }: TimelineCardProps = $props();

	let isOpen = $state(false);

	function toggle() {
		isOpen = !isOpen;
	}
</script>

<div class="timeline-item">
	<div class="timeline-marker-container">
		<div class="timeline-marker"></div>
		{#if !isLast}
			<div class="timeline-line"></div>
		{/if}
	</div>
	<div class="timeline-card">
		<button class="timeline-title" onclick={toggle}>
			<span class="timeline-title-text">{title}</span>
			<span class="timeline-toggle">{isOpen ? '−' : '+'}</span>
		</button>
		{#if isOpen}
			<hr class="timeline-divider" transition:slide={{ duration: 300 }} />
			<div class="timeline-content" transition:slide={{ duration: 300 }}>
				<Lexical data={content} />
			</div>
		{/if}
	</div>
</div>

<style>
	.timeline-item {
		display: grid;
		grid-template-columns: 40px 1fr;
		gap: 1rem;
		position: relative;
		margin-bottom: 2rem;
	}

	.timeline-marker-container {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.timeline-marker {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #6b5634;
		border: 3px solid #c9b287;
		box-shadow: 0 0 0 3px #7a6a4a;
		position: relative;
		z-index: 2;
		margin-top: 0.5rem;
		flex-shrink: 0;
	}

	.timeline-line {
		position: absolute;
		left: 50%;
		top: 30px;
		bottom: -32px;
		width: 2px;
		background: #9d8659;
		transform: translateX(-50%);
		z-index: 1;
	}

	.timeline-card {
		background: rgba(255, 255, 255, 0.8);
		border: var(--border-width) solid #7a6a4a;
		padding: clamp(1rem, 1rem + 1vw, 2rem);
		border-radius: 4px;
	}

	.timeline-title {
		width: 100%;
		background: none;
		border: none;
		font-family: var(--font-special-elite);
		font-size: var(--fs-base);
		color: #3d3424;
		margin: 0;
		padding: 0;
		text-align: left;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: color 0.2s ease;
	}

	.timeline-title:hover {
		color: #6b5634;
	}

	.timeline-title-text {
		flex: 1;
	}

	.timeline-toggle {
		font-size: 1.5rem;
		line-height: 1;
		font-family: monospace;
		font-weight: bold;
	}

	.timeline-divider {
		margin: 0.75rem 0;
		border: none;
		border-bottom: 2px solid #7a6a4a;
		opacity: 0.5;
	}

	.timeline-content {
		color: var(--color-tertiary-darker);
		padding-top: 0.5rem;
	}

	@media (max-width: 480px) {
		.timeline-item {
			grid-template-columns: 30px 1fr;
		}

		.timeline-marker {
			width: 15px;
			height: 15px;
		}

		.timeline-line {
			top: 25px;
		}
	}
</style>

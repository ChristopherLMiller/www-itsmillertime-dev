<script lang="ts">
	type StickyNoteProps = {
		className?: string;
		title?: string;
		children?: any;
	};

	const { className = '', title, children }: StickyNoteProps = $props();
</script>

<div class="sticky-note {className}">
	<div class="sticky-note__content">
		{#if title}
			<h2 class="sticky-note__title">{title}</h2>
			<hr class="sticky-note__divider" />
		{/if}
		{@render children?.()}
	</div>
</div>

<style>
	:global(:root) {
		--sticky-note-yellow: #fef3c7;
		--sticky-note-border: #fde68a;
		--sticky-note-shadow: rgba(0, 0, 0, 0.15);
	}

	.sticky-note {
		position: relative;
		background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
		border-radius: 2px;
		box-shadow:
			0 1px 3px var(--sticky-note-shadow),
			0 5px 15px -5px var(--sticky-note-shadow);
		padding: 1.5rem;
		width: min(20rem, 90vw);
		aspect-ratio: 1;
		transform: rotate(-1deg);
		transition: transform 250ms ease, box-shadow 250ms ease;
	}

	.sticky-note::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 1.5rem,
			rgba(219, 182, 65, 0.1) 1.5rem,
			rgba(219, 182, 65, 0.1) calc(1.5rem + 1px)
		);
		pointer-events: none;
		border-radius: 2px;
	}

	.sticky-note::after {
		content: '';
		position: absolute;
		top: -8px;
		left: 50%;
		transform: translateX(-50%);
		width: 5rem;
		height: 1.5rem;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 2px 2px 0 0;
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	.sticky-note:hover {
		transform: rotate(-1deg) translateY(-2px);
		box-shadow:
			0 2px 5px var(--sticky-note-shadow),
			0 8px 20px -5px var(--sticky-note-shadow);
	}

	.sticky-note__content {
		position: relative;
		z-index: 1;
		font-family: 'Delius', sans-serif;
		font-size: 1rem;
		line-height: 1.6;
		color: #3f3f46;
		word-wrap: break-word;
		overflow-wrap: break-word;
		hyphens: auto;
	}

	.sticky-note__content :global(p) {
		margin: 0.5rem 0;
	}

	.sticky-note__content :global(p:first-child) {
		margin-top: 0;
	}

	.sticky-note__content :global(p:last-child) {
		margin-bottom: 0;
	}

	.sticky-note__content :global(div) {
		margin: 0.4rem 0;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	.sticky-note__content :global(div:first-of-type) {
		margin-top: 0;
	}

	.sticky-note__content :global(div:last-of-type) {
		margin-bottom: 0;
	}

	.sticky-note__title {
		margin: 0 0 0.5rem 0;
		font-family: 'Delius', sans-serif;
		font-size: 1.15rem;
		font-weight: 700;
		color: #27272a;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	.sticky-note__divider {
		margin: 0.5rem 0 1rem 0;
		border: none;
		height: 2px;
		background: none;
		position: relative;
		overflow: hidden;
	}

	.sticky-note__divider::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 1.5px;
		background: repeating-linear-gradient(
			to right,
			rgba(0, 0, 0, 0.35) 0px,
			rgba(0, 0, 0, 0.35) 3px,
			transparent 3px,
			transparent 4px
		);
		transform: translateY(-50%) rotate(-0.5deg);
		filter: blur(0.3px);
	}

	.sticky-note__divider::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 1px;
		background: rgba(0, 0, 0, 0.25);
		transform: translateY(-50%) rotate(0.3deg) scaleY(0.8);
	}

	@media (prefers-reduced-motion: reduce) {
		.sticky-note {
			transition: none;
		}
	}
</style>

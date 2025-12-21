<script lang="ts">
	type IconProps = {
		name: 'calendar' | 'clock';
		size?: number;
		color?: string;
		className?: string;
	};

	const { name, size = 20, color = 'currentColor', className = '' }: IconProps = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke={color}
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class="icon {className}"
	aria-hidden="true"
>
	{#if name === 'calendar'}
		<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
		<line x1="16" y1="2" x2="16" y2="6"></line>
		<line x1="8" y1="2" x2="8" y2="6"></line>
		<line x1="3" y1="10" x2="21" y2="10"></line>
	{:else if name === 'clock'}
		<circle cx="12" cy="12" r="10"></circle>
		<polyline points="12 6 12 12 16 14"></polyline>
	{/if}
</svg>

<style>
	.icon {
		display: inline-block;
		vertical-align: middle;
	}
</style>

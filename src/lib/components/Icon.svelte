<script lang="ts">
	type IconProps = {
		name: 'calendar' | 'clock' | 'x' | 'chevron-left' | 'chevron-right';
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
	{:else if name === 'x'}
		<line x1="18" y1="6" x2="6" y2="18"></line>
		<line x1="6" y1="6" x2="18" y2="18"></line>
	{:else if name === 'chevron-left'}
		<polyline points="15 18 9 12 15 6"></polyline>
	{:else if name === 'chevron-right'}
		<polyline points="9 18 15 12 9 6"></polyline>
	{/if}
</svg>

<style>
	.icon {
		display: inline-block;
		vertical-align: middle;
	}
</style>

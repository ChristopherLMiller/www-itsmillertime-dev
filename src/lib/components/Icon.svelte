<script lang="ts">
	type IconProps = {
		name:
			| 'calendar'
			| 'clock'
			| 'x'
			| 'chevron-left'
			| 'chevron-right'
			| 'github'
			| 'npm'
			| 'globe'
			| 'play'
			| 'book'
			| 'link'
			| 'eye';
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
	{:else if name === 'github'}
		<path
			d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
		></path>
	{:else if name === 'npm'}
		<path d="M1 8h22v8H12v2H8v-2H1z" fill={color} stroke="none"></path>
		<path d="M5 12h2v4H5zm4-2h4v6h-2v-4h-1v4h-1zm6 0h4v6h-2v-4h-1v4h-1z" fill="var(--color-white-lighter)" stroke="none"></path>
	{:else if name === 'globe'}
		<circle cx="12" cy="12" r="10"></circle>
		<line x1="2" y1="12" x2="22" y2="12"></line>
		<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
	{:else if name === 'play'}
		<polygon points="5 3 19 12 5 21 5 3"></polygon>
	{:else if name === 'book'}
		<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
		<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
	{:else if name === 'link'}
		<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
		<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
	{:else if name === 'eye'}
		<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
		<circle cx="12" cy="12" r="3"></circle>
	{/if}
</svg>

<style>
	.icon {
		display: inline-block;
		vertical-align: middle;
	}
</style>

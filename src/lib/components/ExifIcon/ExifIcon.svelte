<script lang="ts">
	type IconKey =
		| 'camera'
		| 'lens'
		| 'aperture'
		| 'shutter'
		| 'iso'
		| 'focal'
		| 'program'
		| 'bias'
		| 'wb'
		| 'metering'
		| 'flash'
		| 'calendar'
		| 'location';

	let { icon }: { icon: IconKey } = $props();
</script>

<svg
	class="exif-icon"
	width="20"
	height="20"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if icon === 'camera'}
		<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
		<circle cx="12" cy="13" r="4" />
	{:else if icon === 'lens'}
		<circle cx="12" cy="12" r="10" />
		<circle cx="12" cy="12" r="4" />
		<line x1="12" y1="2" x2="12" y2="6" />
		<line x1="12" y1="18" x2="12" y2="22" />
		<line x1="2" y1="12" x2="6" y2="12" />
		<line x1="18" y1="12" x2="22" y2="12" />
	{:else if icon === 'aperture'}
		<circle cx="12" cy="12" r="10" />
		<line x1="14.31" y1="8" x2="20.05" y2="17.94" />
		<line x1="9.69" y1="8" x2="21.17" y2="8" />
		<line x1="7.38" y1="12" x2="13.12" y2="2.06" />
		<line x1="9.69" y1="16" x2="3.95" y2="6.06" />
		<line x1="14.31" y1="16" x2="2.83" y2="16" />
		<line x1="16.62" y1="12" x2="10.88" y2="21.94" />
	{:else if icon === 'shutter'}
		<circle cx="12" cy="12" r="10" />
		<polyline points="12 6 12 12 16 14" />
		<path d="M4 4l4 4M20 4l-4 4M4 20l4-4M20 20l-4-4" />
	{:else if icon === 'iso'}
		<rect x="2" y="6" width="20" height="12" rx="2" />
		<path d="M6 10h4M6 14h6" />
	{:else if icon === 'focal'}
		<path d="M4 12h16" />
		<polyline points="10 8 4 12 10 16" />
		<polyline points="14 8 20 12 14 16" />
	{:else if icon === 'program'}
		<circle cx="12" cy="12" r="3" />
		<path
			d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
		/>
	{:else if icon === 'bias'}
		<text
			x="12"
			y="16"
			text-anchor="middle"
			font-size="12"
			font-weight="600"
			font-family="system-ui, sans-serif"
			fill="currentColor">+ / −</text
		>
	{:else if icon === 'wb'}
		<circle cx="12" cy="12" r="5" />
		<path
			d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
		/>
	{:else if icon === 'metering'}
		<circle cx="12" cy="12" r="10" />
		<circle cx="12" cy="12" r="6" />
		<circle cx="12" cy="12" r="2" />
	{:else if icon === 'flash'}
		<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
	{:else if icon === 'calendar'}
		<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
		<line x1="16" y1="2" x2="16" y2="6" />
		<line x1="8" y1="2" x2="8" y2="6" />
		<line x1="3" y1="10" x2="21" y2="10" />
	{:else if icon === 'location'}
		<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
		<circle cx="12" cy="10" r="3" />
	{/if}
</svg>

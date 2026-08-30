<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		value = $bindable(''),
		id,
		label,
		disabled = false,
		autocomplete = 'off'
	}: {
		value: string;
		id: string;
		label: string;
		disabled?: boolean;
		autocomplete?: HTMLInputAttributes['autocomplete'];
	} = $props();

	let visible = $state(false);
</script>

<div class="field">
	<label for={id}>{label}</label>
	<div class="secret-field">
		<input
			{id}
			name={id}
			type={visible ? 'text' : 'password'}
			{autocomplete}
			spellcheck="false"
			bind:value
			{disabled}
		/>
		<button
			type="button"
			class="secret-toggle"
			aria-pressed={visible}
			aria-controls={id}
			onclick={() => (visible = !visible)}
			{disabled}
		>
			{visible ? 'Hide' : 'Show'}
		</button>
	</div>
</div>

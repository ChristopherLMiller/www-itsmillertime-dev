<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let selectedId = $state(data.templates[0]?.id ?? '');
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);
	let html = $state('');
	let label = $state('');

	async function loadTemplate(id: string) {
		if (!id) {
			html = '';
			label = '';
			return;
		}
		loading = true;
		errorMessage = null;
		try {
			const res = await fetch(`/api/admin/email-preview?template=${encodeURIComponent(id)}`, {
				headers: { Accept: 'application/json' }
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				html = '';
				label = '';
				errorMessage =
					typeof body === 'object' && body && typeof (body as { error?: string }).error === 'string'
						? (body as { error: string }).error
						: 'Failed to render template.';
				return;
			}
			html = typeof body.html === 'string' ? body.html : '';
			label = typeof body.label === 'string' ? body.label : id;
		} catch {
			errorMessage = 'Failed to render template.';
			html = '';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void loadTemplate(selectedId);
	});
</script>

<svelte:head>
	<title>Email preview | itsMillerTime.dev</title>
</svelte:head>

<div class="admin-page">
	<div class="admin-page__head">
		<h1>Email preview</h1>
		{#if !data.loadError && data.templates.length > 0}
			<label class="field" for="email-template">
				<span>Template</span>
				<select id="email-template" bind:value={selectedId} disabled={loading}>
					{#each data.templates as template (template.id)}
						<option value={template.id}>{template.label}</option>
					{/each}
				</select>
			</label>
		{/if}
	</div>
	{#if data.loadError}
		<p class="message error" role="alert">{data.loadError}</p>
	{:else if data.templates.length === 0}
		<p>No templates are available.</p>
	{:else if errorMessage}
		<p class="message error" role="alert">{errorMessage}</p>
	{:else if loading}
		<p>Rendering…</p>
	{:else if html}
		<iframe class="email-preview-frame" title="Email preview for {label}" srcdoc={html} sandbox=""
		></iframe>
	{/if}
</div>

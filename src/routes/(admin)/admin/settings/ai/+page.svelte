<script lang="ts">
	import SecretField from '$lib/components/admin/SecretField.svelte';
	import { cloneSiteSettings, patchSiteSettings } from '$lib/settings/client';
	import {
		CUSTOM_PROMPT_USE,
		ensurePromptSlugs,
		isKnownPromptUse,
		PROMPT_USES,
		promptUseLabel,
		type SitePrompt
	} from '$lib/settings/prompts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let draft = $state(data.settings ? cloneSiteSettings(data.settings) : null);
	let saving = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	function hasPromptUse(slug: string, exceptIndex?: number): boolean {
		if (!draft) return false;
		const want = slug.trim().toLowerCase();
		return draft.ai.prompts.some(
			(row, i) => i !== exceptIndex && row.slug.trim().toLowerCase() === want
		);
	}

	function newPrompt(): SitePrompt {
		return { slug: '', label: '', body: '' };
	}

	function addPrompt() {
		if (!draft) return;
		draft.ai.prompts = [...draft.ai.prompts, newPrompt()];
	}

	function removePrompt(index: number) {
		if (!draft) return;
		draft.ai.prompts = draft.ai.prompts.filter((_, i) => i !== index);
	}

	function promptUseValue(prompt: SitePrompt): string {
		return isKnownPromptUse(prompt.slug) ? prompt.slug.trim().toLowerCase() : CUSTOM_PROMPT_USE;
	}

	function setPromptUse(prompt: SitePrompt, value: string) {
		if (value === CUSTOM_PROMPT_USE) {
			if (isKnownPromptUse(prompt.slug)) prompt.slug = '';
			return;
		}
		prompt.slug = value;
		const use = PROMPT_USES.find((row) => row.slug === value);
		if (use && !prompt.label.trim()) prompt.label = use.label;
	}

	function promptTitle(prompt: SitePrompt, index: number): string {
		return (
			prompt.label.trim() ||
			promptUseLabel(prompt.slug) ||
			prompt.slug.trim() ||
			`Prompt ${index + 1}`
		);
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!draft) return;
		draft.ai.prompts = ensurePromptSlugs(draft.ai.prompts);
		const seen = new Set<string>();
		for (const row of draft.ai.prompts) {
			const slug = row.slug.trim().toLowerCase();
			if (!slug || !isKnownPromptUse(slug)) continue;
			if (seen.has(slug)) {
				errorMessage = `Only one prompt can be assigned to “${promptUseLabel(slug)}”.`;
				successMessage = null;
				return;
			}
			seen.add(slug);
		}
		saving = true;
		errorMessage = null;
		successMessage = null;
		try {
			const saved = await patchSiteSettings({ ai: draft.ai });
			draft = cloneSiteSettings(saved);
			successMessage = 'AI settings saved.';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to save AI settings.';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>AI settings | itsMillerTime.dev</title>
</svelte:head>

<div class="admin-page">
	{#if data.loadError || !draft}
		<div class="admin-page__head">
			<h1>AI</h1>
		</div>
		<p class="message error" role="alert">{data.loadError ?? 'Settings are unavailable.'}</p>
	{:else}
		<form class="admin-form" onsubmit={save}>
			<div class="admin-page__head">
				<h1>AI</h1>
				<div class="admin-actions">
					<button type="button" class="submit-btn secondary" onclick={addPrompt} disabled={saving}>
						Add prompt
					</button>
					<button type="submit" class="submit-btn" disabled={saving}>
						{saving ? 'Saving…' : 'Save'}
					</button>
				</div>
			</div>
			{#if errorMessage}
				<div class="message error" role="alert">{errorMessage}</div>
			{/if}
			{#if successMessage}
				<div class="message success" role="status">{successMessage}</div>
			{/if}
			<section class="admin-block">
				<h2>Connection</h2>
				<div class="admin-form--fields">
					<label class="field" for="ai-provider">
						<span>Provider</span>
						<select id="ai-provider" bind:value={draft.ai.provider} disabled={saving}>
							<option value="anthropic">Anthropic</option>
							<option value="openai">OpenAI</option>
						</select>
					</label>
					<label class="field" for="ai-model">
						<span>Model</span>
						<input
							id="ai-model"
							type="text"
							autocomplete="off"
							spellcheck="false"
							placeholder={draft.ai.provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-5'}
							bind:value={draft.ai.model}
							disabled={saving}
						/>
					</label>
					<SecretField
						id="ai-api-key"
						label="API key"
						bind:value={draft.ai.apiKey}
						disabled={saving}
						autocomplete="off"
					/>
				</div>
			</section>
			<section class="admin-block admin-block--fill">
				<h2>Prompts</h2>
				<div class="prompt-list">
					{#each draft.ai.prompts as prompt, index (prompt.id ?? `row-${index}:${prompt.slug}`)}
						<article class="prompt-row">
							<div class="prompt-row__top">
								<h3 class="prompt-row__title">{promptTitle(prompt, index)}</h3>
								<button
									type="button"
									class="submit-btn secondary"
									onclick={() => removePrompt(index)}
									disabled={saving}
								>
									Remove
								</button>
							</div>
							<div
								class="prompt-row-head"
								class:prompt-row-head--custom={promptUseValue(prompt) === CUSTOM_PROMPT_USE}
							>
								<label class="field" for="prompt-use-{index}">
									<span>Used for</span>
									<select
										id="prompt-use-{index}"
										value={promptUseValue(prompt)}
										disabled={saving}
										onchange={(event) =>
											setPromptUse(prompt, (event.currentTarget as HTMLSelectElement).value)}
									>
										{#each PROMPT_USES as use (use.slug)}
											<option value={use.slug} disabled={hasPromptUse(use.slug, index)}>
												{use.label}
											</option>
										{/each}
										<option value={CUSTOM_PROMPT_USE}>None</option>
									</select>
								</label>
								{#if promptUseValue(prompt) === CUSTOM_PROMPT_USE}
									<label class="field" for="prompt-slug-{index}">
										<span>Slug</span>
										<input
											id="prompt-slug-{index}"
											type="text"
											autocomplete="off"
											spellcheck="false"
											placeholder="slug"
											bind:value={prompt.slug}
											disabled={saving}
										/>
									</label>
								{/if}
								<label class="field" for="prompt-label-{index}">
									<span>Label</span>
									<input
										id="prompt-label-{index}"
										type="text"
										autocomplete="off"
										bind:value={prompt.label}
										disabled={saving}
									/>
								</label>
							</div>
							<label class="field">
								<span>Body</span>
								<textarea bind:value={prompt.body} disabled={saving}></textarea>
							</label>
						</article>
					{/each}
				</div>
			</section>
		</form>
	{/if}
</div>

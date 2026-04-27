<script lang="ts">
	import { page } from '$app/state';
	import Panel from '$lib/Panel.svelte';

	const status = $derived(page.status);
	const technicalMessage = $derived(page.error?.message?.trim() || null);

	const context = $derived.by(() => {
		const s = status;
		if (s === 404) {
			return {
				kind: 'not-found' as const,
				title: 'Page not found',
				lead: 'Nothing lives at this URL — it may be mistyped, out of date, or the content was moved.',
				hints: [
					'Check the address bar for typos.',
					'Use the menu above to browse the site.',
					'If you followed a link from elsewhere, it might point to an old location.'
				]
			};
		}
		if (s === 403) {
			return {
				kind: 'forbidden' as const,
				title: 'Access denied',
				lead: 'You don’t have permission to view this page with the account you’re using.',
				hints: [
					'Try signing in with a different account if you have one.',
					'If you think this is a mistake, contact the site owner.'
				]
			};
		}
		if (s >= 500) {
			return {
				kind: 'server' as const,
				title: 'Something went wrong on our side',
				lead: 'The server hit an error while loading this page. That’s almost always a bug or temporary issue on the site — not something you did wrong.',
				hints: [
					'Wait a minute and refresh the page.',
					'If it keeps happening, try again later or from another network.',
					'Persistent problems are worth reporting so they can be fixed.'
				]
			};
		}
		return {
			kind: 'client' as const,
			title: 'Request couldn’t be completed',
			lead: 'The server couldn’t fulfill this request. Details below may help explain what happened.',
			hints: [
				'Go back and try the action again.',
				'If you were submitting a form, check that all fields are valid.'
			]
		};
	});

	const docTitle = $derived(
		context.kind === 'not-found'
			? 'Page not found'
			: context.kind === 'forbidden'
				? 'Access denied'
				: context.kind === 'server'
					? 'Server error'
					: 'Something went wrong'
	);
</script>

<svelte:head>
	<title>{docTitle} | itsMillerTime.dev</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="error-page">
	<Panel hasBorder hasPadding>
		<p class="status-code" aria-hidden="true">{status}</p>
		<h1>{context.title}</h1>
		<p class="lead">{context.lead}</p>

		<ul class="hints">
			{#each context.hints as hint (hint)}
				<li>{hint}</li>
			{/each}
		</ul>

		{#if technicalMessage}
			<details class="technical">
				<summary>Technical details</summary>
				<p class="mono">{technicalMessage}</p>
			</details>
		{/if}

		<p class="path">
			<span class="path-label">Requested path:</span>
			<code>{page.url.pathname}{page.url.search}</code>
		</p>

		<nav class="actions" aria-label="What to do next">
			<a class="btn primary" href="/">Home</a>
			<button type="button" class="btn secondary" onclick={() => history.back()}>Go back</button>
			<button type="button" class="btn secondary" onclick={() => window.location.reload()}
				>Retry</button
			>
		</nav>
	</Panel>
</div>

<style lang="postcss">
	.error-page {
		max-width: 42rem;
		margin-inline: auto;
		padding-block: clamp(1.5rem, 4vw, 3rem);
	}

	.status-code {
		font-family: var(--font-source-code-pro);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		margin: 0 0 0.25rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h1 {
		font-family: var(--font-permanent-marker);
		font-size: var(--fs-xl);
		color: var(--color-primary);
		margin: 0 0 0.75rem;
		line-height: 1.2;
	}

	.lead {
		font-family: var(--font-roboto);
		font-size: var(--fs-base);
		color: var(--color-tertiary-darker);
		margin: 0 0 1rem;
		line-height: 1.55;
	}

	.hints {
		margin: 0 0 1.25rem;
		padding-left: 1.25rem;
		font-family: var(--font-roboto);
		font-size: var(--fs-s);
		color: var(--color-tertiary-darker);
		line-height: 1.5;
	}

	.technical {
		margin: 0 0 1rem;
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		border: 1px solid var(--color-tertiary-lighter);
		border-radius: 4px;
		padding: 0.5rem 0.75rem;
		background: oklch(0.98 0.01 90);
	}

	.technical summary {
		cursor: pointer;
		font-weight: 500;
		color: var(--color-tertiary-darker);
	}

	.mono {
		margin: 0.5rem 0 0;
		font-family: var(--font-source-code-pro);
		font-size: var(--fs-xs);
		word-break: break-word;
		color: var(--color-tertiary-darker);
	}

	.path {
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		margin: 0 0 1.25rem;
		line-height: 1.4;
	}

	.path-label {
		display: block;
		margin-bottom: 0.25rem;
	}

	code {
		font-family: var(--font-source-code-pro);
		font-size: 0.9em;
		background: var(--color-white-lightest);
		padding: 0.15rem 0.35rem;
		border-radius: 3px;
		word-break: break-all;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	.btn {
		font-family: var(--font-roboto);
		font-size: var(--fs-s);
		padding: 0.5rem 1rem;
		border-radius: 4px;
		border: 2px solid var(--color-tertiary-lighter);
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
	}

	.btn.primary {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-white-lightest);
	}

	.btn.primary:hover {
		background: var(--color-primary-darker);
		border-color: var(--color-primary-darker);
	}

	.btn.secondary {
		background: var(--color-white-lightest);
		color: var(--color-tertiary-darkest);
	}

	.btn.secondary:hover {
		border-color: var(--color-primary);
	}
</style>

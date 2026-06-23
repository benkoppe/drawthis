<script lang="ts">
	import { asset, base } from '$app/paths';
	import type { DrawingReference, ReferenceFeedResponse } from '$lib/references';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let loadedReference = $state<DrawingReference | undefined>();
	let seenReferenceIds = $state<string[]>([]);
	let isReady = $state(false);
	let isLoadingReference = $state(false);
	let errorMessage = $state<string | undefined>();
	let currentReference = $derived(loadedReference ?? data.references[0]);
	let currentImageUrl = $derived(
		currentReference ? resolveReferenceUrl(currentReference.image.url) : ''
	);
	let currentSourceUrl = $derived(
		currentReference ? resolveReferenceUrl(currentReference.attribution.sourceUrl) : ''
	);
	let canAdvance = $derived(isReady && !isLoadingReference);

	onMount(() => {
		isReady = true;
	});

	function resolveReferenceUrl(url: string): string {
		return url.startsWith('/') ? asset(url) : url;
	}

	async function showNextReference() {
		if (!canAdvance) {
			return;
		}

		isLoadingReference = true;
		errorMessage = undefined;

		const currentReferenceId = currentReference?.id;
		const recentReferenceIds = currentReferenceId
			? [...seenReferenceIds, currentReferenceId].slice(-50)
			: seenReferenceIds;

		try {
			const response = await fetch(`${base}/api/references`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ count: 1, recentReferenceIds })
			});

			if (!response.ok) {
				throw new Error('Could not load the next reference.');
			}

			const feed = (await response.json()) as ReferenceFeedResponse;
			const [nextReference] = feed.references;

			if (!nextReference) {
				throw new Error('No references are available right now.');
			}

			loadedReference = nextReference;
			seenReferenceIds = recentReferenceIds;
		} catch (cause) {
			errorMessage = cause instanceof Error ? cause.message : 'Could not load the next reference.';
		} finally {
			isLoadingReference = false;
		}
	}
</script>

<svelte:head>
	<title>DrawThis</title>
	<meta name="description" content="A fast, low-friction drawing reference practice tool." />
</svelte:head>

<main class="practice-page">
	<header class="app-header">
		<p class="app-label">DrawThis</p>
	</header>

	<section class="practice-loop" aria-labelledby="reference-heading">
		{#if currentReference}
			<div class="reference-toolbar" aria-live="polite">
				<div class="reference-controls">
					<div class="reference-meta">
						<h1 id="reference-heading">{currentReference.title}</h1>
						<p>{currentReference.category}</p>
					</div>

					<button type="button" disabled={!canAdvance} onclick={showNextReference}>
						{isLoadingReference ? 'Loading…' : 'Next reference'}
					</button>
				</div>

				{#if errorMessage}
					<p class="reference-error">{errorMessage}</p>
				{/if}
			</div>

			<figure>
				<img src={currentImageUrl} alt={currentReference.image.alt} />

				<figcaption>
					<span>{currentReference.attribution.label}</span>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href={currentSourceUrl}>Open source image</a>
				</figcaption>
			</figure>
		{:else}
			<div class="empty-state" aria-live="polite">
				<h1 id="reference-heading">No references available</h1>
				<p>Try again later.</p>
			</div>
		{/if}
	</section>
</main>

<style>
	:global(body) {
		margin: 0;
		background: #f7f7f4;
		color: #111827;
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.practice-page {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 8px;
		width: min(100%, 1200px);
		height: 100vh;
		margin: 0 auto;
		padding: 12px;
	}

	.app-header {
		min-width: 0;
	}

	.app-label,
	.reference-meta p,
	figcaption {
		color: #4b5563;
	}

	.app-label {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 700;
	}

	h1,
	p {
		margin-top: 0;
	}

	h1 {
		margin-bottom: 0;
		font-size: 1rem;
		line-height: 1.2;
	}

	.practice-loop {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		width: 100%;
		min-height: 0;
		border: 1px solid #d1d5db;
		background: #ffffff;
	}

	.reference-toolbar {
		display: grid;
		gap: 6px;
		padding: 8px 12px 10px;
		border-bottom: 1px solid #d1d5db;
	}

	.reference-controls {
		display: flex;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
	}

	.reference-meta {
		display: flex;
		gap: 8px;
		align-items: baseline;
		min-width: 0;
	}

	.reference-meta p,
	.reference-error {
		margin-bottom: 0;
		font-size: 0.875rem;
	}

	.reference-error {
		color: #991b1b;
	}

	button {
		min-height: 44px;
		padding: 0 16px;
		border: 1px solid #111827;
		border-radius: 0;
		background: #111827;
		color: #ffffff;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	button:hover {
		background: #374151;
	}

	button:disabled {
		cursor: wait;
		opacity: 0.65;
	}

	button:focus-visible,
	a:focus-visible {
		outline: 3px solid #2563eb;
		outline-offset: 3px;
	}

	figure {
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		min-height: 0;
		margin: 0;
	}

	img {
		display: block;
		width: 100%;
		height: 100%;
		min-height: 0;
		object-fit: contain;
		background: #f7f7f4;
	}

	figcaption {
		display: flex;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border-top: 1px solid #d1d5db;
		font-size: 0.8125rem;
	}

	a {
		color: #111827;
		text-underline-offset: 0.2em;
	}

	.empty-state {
		padding: 12px;
	}

	@media (max-width: 640px) {
		.practice-page {
			padding: 8px;
		}

		.reference-controls,
		figcaption {
			align-items: stretch;
			flex-direction: column;
		}

		.reference-meta {
			flex-wrap: wrap;
		}

		button {
			width: 100%;
		}
	}
</style>

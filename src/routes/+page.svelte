<script lang="ts">
	import { asset } from '$app/paths';
	import { getNextReferenceIndex, localReferences } from '$lib/references';
	import { onMount } from 'svelte';

	let currentReferenceIndex = $state(0);
	let isReady = $state(false);
	let currentReference = $derived(localReferences[currentReferenceIndex]);
	let currentImageUrl = $derived(asset(currentReference.imageUrl));
	let currentSourceUrl = $derived(asset(currentReference.sourceUrl));

	onMount(() => {
		isReady = true;
	});

	function showNextReference() {
		currentReferenceIndex = getNextReferenceIndex(currentReferenceIndex, localReferences.length);
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
		<div class="reference-toolbar" aria-live="polite">
			<div class="reference-controls">
				<div class="reference-meta">
					<h1 id="reference-heading">{currentReference.title}</h1>
					<p>{currentReference.category}</p>
				</div>

				<button type="button" disabled={!isReady} onclick={showNextReference}>Next reference</button
				>
			</div>
		</div>

		<figure>
			<img src={currentImageUrl} alt={currentReference.alt} />

			<figcaption>
				<span>{currentReference.credit}</span>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={currentSourceUrl}>Open source image</a>
			</figcaption>
		</figure>
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

	.reference-meta p {
		margin-bottom: 0;
		font-size: 0.875rem;
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

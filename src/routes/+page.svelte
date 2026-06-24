<script lang="ts">
	import { asset, base } from '$app/paths';
	import {
		appendReferenceHistoryEntry,
		appendReferenceTimelineEntry,
		createReferenceTimelineEntry,
		createReferenceTimelineTabId,
		getLastViewedReferenceHistoryEntry,
		getRecentReferenceHistoryEntries,
		getReferenceHistoryEntriesByIds,
		imagePreloadAheadCount,
		maxReferenceTabTimelineEntries,
		mergeRecentReferenceContexts,
		mergeRecentReferenceIds,
		parseRecentReferenceContexts,
		parseRecentReferenceIds,
		parseReferenceTabTimelineState,
		referenceCategoryLabels,
		referenceContextHistoryStorageKey,
		referenceHistoryStorageKey,
		referenceQueueLowWatermark,
		referenceQueueTargetSize,
		referenceTimelineSessionStorageKey,
		requestReferenceFeed,
		serializeRecentReferenceContexts,
		serializeRecentReferenceIds,
		serializeReferenceTabTimelineState,
		setLastViewedReferenceHistoryEntryId,
		toReferenceFeedContextItem,
		type DrawingReference,
		type ReferenceFeedContextItem,
		type ReferenceTabTimelineState,
		type ReferenceTimelineEntry
	} from '$lib/references';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	// svelte-ignore state_referenced_locally
	const initialReferences = data.references;

	let currentReference = $state<DrawingReference | undefined>();
	let referenceQueue = $state<DrawingReference[]>(initialReferences.slice(1));
	let avoidanceReferenceIds = $state<string[]>([]);
	let avoidanceReferenceContexts = $state<ReferenceFeedContextItem[]>([]);
	let referenceTimelineEntries = $state<ReferenceTimelineEntry[]>([]);
	let referenceTimelineCursorIndex = $state(-1);
	let activeTimelineTabId = '';
	let preloadedReferenceIds: string[] = [];
	let isReady = $state(false);
	let isLoadingReference = $state(false);
	let isRefillingQueue = $state(false);
	let errorMessage = $state<string | undefined>();
	let currentImageUrl = $derived(
		currentReference ? resolveReferenceUrl(currentReference.image.url) : ''
	);
	let currentSourceUrl = $derived(
		currentReference ? resolveReferenceUrl(currentReference.attribution.sourceUrl) : ''
	);
	let currentCategoryLabel = $derived(
		currentReference ? referenceCategoryLabels[currentReference.category] : ''
	);
	let isAtTimelineTail = $derived(
		referenceTimelineCursorIndex === referenceTimelineEntries.length - 1
	);
	let canGoBack = $derived(isReady && referenceTimelineCursorIndex > 0);
	let canGoNext = $derived(
		isReady &&
			(!isAtTimelineTail || referenceQueue.length > 0 || (!isLoadingReference && !isRefillingQueue))
	);

	onMount(() => {
		void initializePracticeState();
	});

	async function initializePracticeState(): Promise<void> {
		avoidanceReferenceContexts = mergeRecentReferenceContexts(
			readStoredRecentReferenceContexts(),
			data.recentReferences,
			initialReferences.map(toReferenceFeedContextItem)
		);
		avoidanceReferenceIds = mergeRecentReferenceIds(
			readStoredRecentReferenceIds(),
			data.recentReferenceIds,
			avoidanceReferenceContexts.map((reference) => reference.id),
			referenceQueue.map((reference) => reference.id)
		);
		writeStoredRecentReferenceIds(avoidanceReferenceIds);
		writeStoredRecentReferenceContexts(avoidanceReferenceContexts);

		await initializeReferenceTimeline();

		if (currentReference !== undefined) {
			const currentReferenceId = currentReference.id;
			setReferenceQueue(referenceQueue.filter((reference) => reference.id !== currentReferenceId));
			rememberAvoidanceReferences([currentReference]);
		}

		isReady = true;
		preloadQueuedImages();
		void ensureReferenceQueueFilled();
	}

	function resolveReferenceUrl(url: string): string {
		return url.startsWith('/') ? asset(url) : url;
	}

	function readStoredRecentReferenceIds(): string[] {
		try {
			return parseRecentReferenceIds(localStorage.getItem(referenceHistoryStorageKey));
		} catch {
			return [];
		}
	}

	function readStoredRecentReferenceContexts(): ReferenceFeedContextItem[] {
		try {
			return parseRecentReferenceContexts(localStorage.getItem(referenceContextHistoryStorageKey));
		} catch {
			return [];
		}
	}

	function readStoredReferenceTabTimelineState(): ReferenceTabTimelineState | undefined {
		try {
			return parseReferenceTabTimelineState(
				sessionStorage.getItem(referenceTimelineSessionStorageKey)
			);
		} catch {
			return undefined;
		}
	}

	function writeStoredReferenceTabTimelineState(state: ReferenceTabTimelineState): void {
		try {
			sessionStorage.setItem(
				referenceTimelineSessionStorageKey,
				serializeReferenceTabTimelineState(state)
			);
		} catch {
			// Ignore unavailable or full tab storage; durable history still tracks seen references.
		}
	}

	function writeStoredRecentReferenceIds(referenceIds: readonly string[]): void {
		try {
			localStorage.setItem(referenceHistoryStorageKey, serializeRecentReferenceIds(referenceIds));
		} catch {
			// Ignore unavailable or full browser storage; the server cookie still tracks recent history.
		}
	}

	function writeStoredRecentReferenceContexts(
		referenceContexts: readonly ReferenceFeedContextItem[]
	): void {
		try {
			localStorage.setItem(
				referenceContextHistoryStorageKey,
				serializeRecentReferenceContexts(referenceContexts)
			);
		} catch {
			// Ignore unavailable or full browser storage; the server cookie still tracks recent history.
		}
	}

	function rememberAvoidanceReferences(
		references: readonly (DrawingReference | undefined)[]
	): void {
		const referenceContexts = references
			.filter((reference): reference is DrawingReference => reference !== undefined)
			.map(toReferenceFeedContextItem);

		avoidanceReferenceContexts = mergeRecentReferenceContexts(
			avoidanceReferenceContexts,
			referenceContexts
		);
		avoidanceReferenceIds = mergeRecentReferenceIds(
			avoidanceReferenceIds,
			referenceContexts.map((reference) => reference.id)
		);
		writeStoredRecentReferenceIds(avoidanceReferenceIds);
		writeStoredRecentReferenceContexts(avoidanceReferenceContexts);
	}

	function persistReferenceTimeline(): void {
		const cursorEntryId = referenceTimelineEntries[referenceTimelineCursorIndex]?.id;

		if (activeTimelineTabId.length === 0) {
			return;
		}

		writeStoredReferenceTabTimelineState({
			tabId: activeTimelineTabId,
			entryIds: referenceTimelineEntries.map((entry) => entry.id),
			cursorEntryId
		});
	}

	async function initializeReferenceTimeline(): Promise<void> {
		const storedTimelineState = readStoredReferenceTabTimelineState();
		activeTimelineTabId = storedTimelineState?.tabId ?? createReferenceTimelineTabId();

		if (storedTimelineState !== undefined && storedTimelineState.entryIds.length > 0) {
			const entriesById = await getReferenceHistoryEntriesByIds(storedTimelineState.entryIds).catch(
				() => new Map<string, ReferenceTimelineEntry>()
			);
			const restoredEntries = storedTimelineState.entryIds.flatMap((entryId) => {
				const entry = entriesById.get(entryId);
				return entry === undefined ? [] : [entry];
			});

			if (restoredEntries.length > 0) {
				referenceTimelineEntries = restoredEntries;
				const cursorIndex = restoredEntries.findIndex(
					(entry) => entry.id === storedTimelineState.cursorEntryId
				);
				referenceTimelineCursorIndex =
					cursorIndex === -1 ? restoredEntries.length - 1 : cursorIndex;
				currentReference = referenceTimelineEntries[referenceTimelineCursorIndex]?.reference;
				persistReferenceTimeline();
				void rememberLastViewedTimelineEntry();
				return;
			}
		}

		const [recentEntries, lastViewedEntry] = await Promise.all([
			getRecentReferenceHistoryEntries(maxReferenceTabTimelineEntries).catch(() => []),
			getLastViewedReferenceHistoryEntry().catch(() => undefined)
		]);

		if (recentEntries.length > 0) {
			referenceTimelineEntries = recentEntries;
			const cursorIndex = recentEntries.findIndex((entry) => entry.id === lastViewedEntry?.id);
			referenceTimelineCursorIndex = cursorIndex === -1 ? recentEntries.length - 1 : cursorIndex;
			currentReference = referenceTimelineEntries[referenceTimelineCursorIndex]?.reference;
			persistReferenceTimeline();
			void rememberLastViewedTimelineEntry();
			return;
		}

		const [initialReference] = initialReferences;

		if (initialReference !== undefined) {
			await appendDisplayedReferenceToTimeline(initialReference);
		}
	}

	async function rememberLastViewedTimelineEntry(): Promise<void> {
		const currentEntryId = referenceTimelineEntries[referenceTimelineCursorIndex]?.id;

		if (currentEntryId !== undefined) {
			await setLastViewedReferenceHistoryEntryId(currentEntryId).catch(() => undefined);
		}
	}

	async function appendDisplayedReferenceToTimeline(reference: DrawingReference): Promise<void> {
		if (activeTimelineTabId.length === 0) {
			activeTimelineTabId = createReferenceTimelineTabId();
		}

		const referenceSnapshot = $state.snapshot(reference) as DrawingReference;
		const timelineEntry = createReferenceTimelineEntry(referenceSnapshot, activeTimelineTabId);
		const nextTimelineEntries = appendReferenceTimelineEntry(
			referenceTimelineEntries,
			timelineEntry,
			referenceTimelineCursorIndex
		);
		const entryWasAppended = nextTimelineEntries.some((entry) => entry.id === timelineEntry.id);

		referenceTimelineEntries = nextTimelineEntries;
		referenceTimelineCursorIndex = nextTimelineEntries.length - 1;
		currentReference = referenceSnapshot;
		persistReferenceTimeline();

		if (entryWasAppended) {
			await appendReferenceHistoryEntry(timelineEntry).catch(() => undefined);
			return;
		}

		await rememberLastViewedTimelineEntry();
	}

	function showTimelineEntry(index: number): void {
		const timelineEntry = referenceTimelineEntries[index];

		if (timelineEntry === undefined) {
			return;
		}

		referenceTimelineCursorIndex = index;
		currentReference = timelineEntry.reference;
		persistReferenceTimeline();
		void rememberLastViewedTimelineEntry();
	}

	function getPrecedingReferenceContexts(): ReferenceFeedContextItem[] {
		return [currentReference, ...referenceQueue]
			.filter((reference): reference is DrawingReference => reference !== undefined)
			.map(toReferenceFeedContextItem);
	}

	function setReferenceQueue(nextQueue: DrawingReference[]): void {
		referenceQueue = nextQueue;
		preloadQueuedImages();
	}

	async function preloadImage(url: string): Promise<void> {
		const image = new Image();
		image.src = url;

		if (image.decode === undefined) {
			await new Promise<void>((resolve, reject) => {
				image.onload = () => resolve();
				image.onerror = () => reject(new Error('Image preload failed'));
			});
			return;
		}

		await image.decode();
	}

	function preloadQueuedImages(): void {
		for (const reference of referenceQueue.slice(0, imagePreloadAheadCount)) {
			if (preloadedReferenceIds.includes(reference.id)) {
				continue;
			}

			preloadedReferenceIds = [...preloadedReferenceIds, reference.id];
			void preloadImage(resolveReferenceUrl(reference.image.url)).catch(() => {
				// A failed speculative preload should not block advancing to the reference.
			});
		}
	}

	async function ensureReferenceQueueFilled(): Promise<void> {
		if (isRefillingQueue || referenceQueue.length > referenceQueueLowWatermark) {
			return;
		}

		isRefillingQueue = true;
		const currentReferenceId = currentReference?.id;

		try {
			const requestedCount = Math.max(referenceQueueTargetSize - referenceQueue.length, 1);
			const feed = await requestReferenceFeed(
				{
					count: requestedCount,
					currentReferenceId,
					recentReferenceIds: avoidanceReferenceIds,
					recentReferences: avoidanceReferenceContexts,
					precedingReferences: getPrecedingReferenceContexts()
				},
				{ fetch, basePath: base }
			);
			const queuedReferenceIds = new Set(referenceQueue.map((reference) => reference.id));
			const newReferences = feed.references.filter(
				(reference) => !queuedReferenceIds.has(reference.id) && reference.id !== currentReferenceId
			);

			if (newReferences.length > 0) {
				setReferenceQueue([...referenceQueue, ...newReferences]);
				rememberAvoidanceReferences(newReferences);
			}
		} catch (cause) {
			if (referenceQueue.length === 0) {
				errorMessage = cause instanceof Error ? cause.message : 'Could not load more references.';
			}
		} finally {
			isRefillingQueue = false;
		}
	}

	async function loadImmediateFallbackReference(): Promise<DrawingReference | undefined> {
		const currentReferenceId = currentReference?.id;
		const feed = await requestReferenceFeed(
			{
				count: 1,
				currentReferenceId,
				recentReferenceIds: avoidanceReferenceIds,
				recentReferences: avoidanceReferenceContexts,
				precedingReferences: getPrecedingReferenceContexts()
			},
			{ fetch, basePath: base }
		);

		return feed.references[0];
	}

	function showPreviousReference(): void {
		if (!canGoBack) {
			return;
		}

		errorMessage = undefined;
		showTimelineEntry(referenceTimelineCursorIndex - 1);
	}

	async function showNextReference(): Promise<void> {
		if (!canGoNext) {
			return;
		}

		errorMessage = undefined;

		if (!isAtTimelineTail) {
			showTimelineEntry(referenceTimelineCursorIndex + 1);
			return;
		}

		const previousReference = currentReference;
		const [queuedReference, ...remainingQueue] = referenceQueue;

		if (queuedReference !== undefined) {
			await appendDisplayedReferenceToTimeline(queuedReference);
			setReferenceQueue(remainingQueue);
			rememberAvoidanceReferences([previousReference, queuedReference]);
			void ensureReferenceQueueFilled();
			return;
		}

		isLoadingReference = true;

		try {
			const nextReference = await loadImmediateFallbackReference();

			if (!nextReference) {
				throw new Error('No references are available right now.');
			}

			await appendDisplayedReferenceToTimeline(nextReference);
			rememberAvoidanceReferences([previousReference, nextReference]);
			void ensureReferenceQueueFilled();
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
		{#if !isReady}
			<div class="empty-state" aria-live="polite">
				<h1 id="reference-heading">Loading references…</h1>
			</div>
		{:else if currentReference}
			<div class="reference-toolbar" aria-live="polite">
				<div class="reference-controls">
					<div class="reference-meta">
						<h1 id="reference-heading">{currentReference.title}</h1>
						<p>{currentCategoryLabel}</p>
					</div>

					<div class="reference-buttons">
						<button
							type="button"
							class="secondary-button"
							disabled={!canGoBack}
							onclick={showPreviousReference}
						>
							Back
						</button>

						<button
							type="button"
							class:loading={isLoadingReference && isAtTimelineTail}
							disabled={!canGoNext}
							onclick={showNextReference}
						>
							{isLoadingReference && isAtTimelineTail ? 'Loading…' : 'Next'}
						</button>
					</div>
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

	.reference-buttons {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-shrink: 0;
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

	.secondary-button {
		background: #ffffff;
		color: #111827;
	}

	.secondary-button:hover {
		background: #f3f4f6;
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.65;
	}

	button.loading:disabled {
		cursor: wait;
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

		.reference-buttons {
			display: grid;
			grid-template-columns: 1fr 1fr;
			width: 100%;
		}

		button {
			width: 100%;
		}
	}
</style>

<script lang="ts">
	import { asset, base } from '$app/paths';
	import {
		appendReferenceHistoryEntry,
		appendReferenceTimelineEntry,
		areReferenceSubjectSelectionsEqual,
		areReferenceTopicSelectionsEqual,
		createReferenceCategoryFilterSelection,
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
		parseReferenceCategoryFilterSelection,
		parseReferenceTabTimelineState,
		normalizeReferenceSubjects,
		normalizeReferenceTopics,
		referenceSubjects,
		referenceTopics,
		referenceCategoryFilterStorageKey,
		referenceSubjectLabels,
		referenceTopicLabels,
		referenceContextHistoryStorageKey,
		referenceHistoryStorageKey,
		referenceQueueLowWatermark,
		referenceQueueTargetSize,
		referenceTimelineSessionStorageKey,
		requestReferenceFeed,
		serializeRecentReferenceContexts,
		serializeRecentReferenceIds,
		serializeReferenceCategoryFilterSelection,
		serializeReferenceTabTimelineState,
		getReferenceSubjectSelectionKey,
		getReferenceTopicSelectionKey,
		setLastViewedReferenceHistoryEntryId,
		toReferenceFeedContextItem,
		type DrawingReference,
		type ReferenceSubjectId,
		type ReferenceTopicId,
		type ReferenceFeedContextItem,
		type ReferenceTabTimelineState,
		type ReferenceTimelineEntry
	} from '$lib/references';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import DelayedSpinner from '$lib/components/DelayedSpinner.svelte';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	// svelte-ignore state_referenced_locally
	const initialReferences = data.references;

	let enabledSubjects = $state<ReferenceSubjectId[]>([...referenceSubjects]);
	let enabledTopics = $state<ReferenceTopicId[]>([...referenceTopics]);
	let categoryFilterStorageIsReady = $state(false);

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
	let referenceFeedRequestGeneration = 0;
	let activeCategoryFilterKey = getCategoryFilterKey(referenceSubjects, referenceTopics);
	let activeQueueRefillAbortController: AbortController | undefined;
	let currentImageUrl = $derived(
		currentReference ? resolveReferenceUrl(currentReference.image.url) : ''
	);
	let currentSourceUrl = $derived(
		currentReference ? resolveReferenceUrl(currentReference.attribution.sourceUrl) : ''
	);
	let currentReferenceLabel = $derived(formatReferenceLabel(currentReference));
	let isAtTimelineTail = $derived(
		referenceTimelineCursorIndex === referenceTimelineEntries.length - 1
	);
	let hasEnabledCategorySelection = $derived(
		normalizeReferenceSubjects(enabledSubjects).length > 0 &&
			normalizeReferenceTopics(enabledTopics, enabledSubjects).length > 0
	);
	let canGoBack = $derived(isReady && referenceTimelineCursorIndex > 0);
	let canGoNext = $derived(
		isReady &&
			hasEnabledCategorySelection &&
			(!isAtTimelineTail || referenceQueue.length > 0 || (!isLoadingReference && !isRefillingQueue))
	);
	let loadedImageUrl = $state('');
	let isImageLoaded = $derived(currentImageUrl !== '' && loadedImageUrl === currentImageUrl);
	let currentSourceCredit = $derived(buildSourceCredit(currentReference));

	onMount(() => {
		void initializePracticeState();
	});

	$effect(() => {
		const normalizedEnabledSubjects = normalizeReferenceSubjects(enabledSubjects);
		const normalizedEnabledTopics = normalizeReferenceTopics(
			enabledTopics,
			normalizedEnabledSubjects
		);

		if (!areReferenceSubjectSelectionsEqual(enabledSubjects, normalizedEnabledSubjects)) {
			enabledSubjects = normalizedEnabledSubjects;
			return;
		}

		if (
			!areReferenceTopicSelectionsEqual(
				enabledTopics,
				normalizedEnabledTopics,
				normalizedEnabledSubjects
			)
		) {
			enabledTopics = normalizedEnabledTopics;
			return;
		}

		writeStoredReferenceCategoryFilterSelection();

		if (normalizedEnabledSubjects.length === 0 || normalizedEnabledTopics.length === 0) {
			handleNoCategoriesSelected();
			return;
		}

		const nextCategoryFilterKey = getCategoryFilterKey(
			normalizedEnabledSubjects,
			normalizedEnabledTopics
		);

		if (nextCategoryFilterKey !== activeCategoryFilterKey) {
			activeCategoryFilterKey = nextCategoryFilterKey;
			handleEnabledCategoriesChanged(normalizedEnabledSubjects, normalizedEnabledTopics);
		}
	});

	function getCategoryFilterKey(
		subjects: readonly ReferenceSubjectId[],
		topics: readonly ReferenceTopicId[]
	): string {
		return `${getReferenceSubjectSelectionKey(subjects)}:${getReferenceTopicSelectionKey(topics, subjects)}`;
	}

	function formatReferenceLabel(reference: DrawingReference | undefined): string {
		if (reference === undefined) {
			return '';
		}

		const subjectLabel = referenceSubjectLabels[reference.taxonomy.primarySubject];
		const topicLabel =
			reference.taxonomy.topic === undefined
				? undefined
				: referenceTopicLabels[reference.taxonomy.topic];

		return topicLabel === undefined ? subjectLabel : `${subjectLabel} · ${topicLabel}`;
	}

	function buildSourceCredit(reference: DrawingReference | undefined): string {
		if (reference === undefined) {
			return '';
		}

		const { creatorName, sourceName } = reference.attribution;

		return creatorName ? `by ${creatorName} on ${sourceName}` : `on ${sourceName}`;
	}

	function handleWindowKeydown(event: KeyboardEvent): void {
		if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
			return;
		}

		const target = event.target;

		if (
			target instanceof HTMLElement &&
			(target.isContentEditable ||
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.tagName === 'SELECT')
		) {
			return;
		}

		const key = event.key.toLowerCase();
		const shouldGoBack = event.key === 'ArrowLeft' || key === 'h';
		const shouldGoNext = event.key === 'ArrowRight' || event.key === ' ' || key === 'l';

		if (shouldGoBack && canGoBack) {
			event.preventDefault();
			showPreviousReference();
		} else if (shouldGoNext && canGoNext) {
			event.preventDefault();
			void showNextReference();
		}
	}

	async function initializePracticeState(): Promise<void> {
		initializeStoredReferenceCategoryFilterSelection();

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

	function initializeStoredReferenceCategoryFilterSelection(): void {
		try {
			const storedSelection = parseReferenceCategoryFilterSelection(
				localStorage.getItem(referenceCategoryFilterStorageKey)
			);

			if (storedSelection !== undefined) {
				enabledSubjects = storedSelection.enabledSubjects;
				enabledTopics = storedSelection.enabledTopics;
			}
		} finally {
			categoryFilterStorageIsReady = true;
		}
	}

	function writeStoredReferenceCategoryFilterSelection(): void {
		if (!categoryFilterStorageIsReady) {
			return;
		}

		try {
			localStorage.setItem(
				referenceCategoryFilterStorageKey,
				serializeReferenceCategoryFilterSelection(
					createReferenceCategoryFilterSelection(enabledSubjects, enabledTopics)
				)
			);
		} catch {
			// Ignore unavailable or full browser storage; the in-memory filter still applies.
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

	function isReferenceInEnabledCategories(
		reference: DrawingReference,
		subjects: readonly ReferenceSubjectId[],
		topics: readonly ReferenceTopicId[]
	): boolean {
		return (
			subjects.includes(reference.taxonomy.primarySubject) &&
			(reference.taxonomy.topic === undefined || topics.includes(reference.taxonomy.topic))
		);
	}

	function filterReferencesByEnabledCategories(
		references: readonly DrawingReference[],
		subjects: readonly ReferenceSubjectId[],
		topics: readonly ReferenceTopicId[]
	): DrawingReference[] {
		return references.filter((reference) =>
			isReferenceInEnabledCategories(reference, subjects, topics)
		);
	}

	function truncateForwardReferenceTimelineEntries(): void {
		if (referenceTimelineCursorIndex < 0 || isAtTimelineTail) {
			return;
		}

		referenceTimelineEntries = referenceTimelineEntries.slice(0, referenceTimelineCursorIndex + 1);
		persistReferenceTimeline();
	}

	function cancelActiveReferenceFeedRequests(): void {
		referenceFeedRequestGeneration += 1;
		activeQueueRefillAbortController?.abort();
		activeQueueRefillAbortController = undefined;
		isRefillingQueue = false;
	}

	function handleNoCategoriesSelected(): void {
		cancelActiveReferenceFeedRequests();
		activeCategoryFilterKey = getCategoryFilterKey([], []);
		errorMessage = undefined;
	}

	function handleEnabledCategoriesChanged(
		subjects: readonly ReferenceSubjectId[],
		topics: readonly ReferenceTopicId[]
	): void {
		cancelActiveReferenceFeedRequests();
		errorMessage = undefined;

		truncateForwardReferenceTimelineEntries();
		setReferenceQueue(filterReferencesByEnabledCategories(referenceQueue, subjects, topics));

		if (isReady) {
			void ensureReferenceQueueFilled({ force: true });
		}
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
		const queuedReferenceIds = new Set(nextQueue.map((reference) => reference.id));

		referenceQueue = nextQueue;
		preloadedReferenceIds = preloadedReferenceIds.filter((referenceId) =>
			queuedReferenceIds.has(referenceId)
		);
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

	async function ensureReferenceQueueFilled(options: { force?: boolean } = {}): Promise<void> {
		if (isRefillingQueue || !hasEnabledCategorySelection) {
			return;
		}

		if (!options.force && referenceQueue.length > referenceQueueLowWatermark) {
			return;
		}

		if (referenceQueue.length >= referenceQueueTargetSize) {
			return;
		}

		const requestGeneration = referenceFeedRequestGeneration;
		const enabledSubjectsSnapshot = normalizeReferenceSubjects(enabledSubjects);
		const enabledTopicsSnapshot = normalizeReferenceTopics(enabledTopics, enabledSubjectsSnapshot);
		const abortController = new AbortController();
		const currentReferenceId = currentReference?.id;

		isRefillingQueue = true;
		activeQueueRefillAbortController = abortController;

		try {
			const requestedCount = Math.max(referenceQueueTargetSize - referenceQueue.length, 1);
			const feed = await requestReferenceFeed(
				{
					count: requestedCount,
					currentReferenceId,
					recentReferenceIds: avoidanceReferenceIds,
					recentReferences: avoidanceReferenceContexts,
					precedingReferences: getPrecedingReferenceContexts(),
					preferences: {
						enabledSubjects: enabledSubjectsSnapshot,
						enabledTopics: enabledTopicsSnapshot
					}
				},
				{ fetch, basePath: base, signal: abortController.signal }
			);

			if (
				requestGeneration !== referenceFeedRequestGeneration ||
				!areReferenceSubjectSelectionsEqual(enabledSubjectsSnapshot, enabledSubjects) ||
				!areReferenceTopicSelectionsEqual(
					enabledTopicsSnapshot,
					enabledTopics,
					enabledSubjectsSnapshot
				)
			) {
				return;
			}

			const queuedReferenceIds = new Set(referenceQueue.map((reference) => reference.id));
			const newReferences = filterReferencesByEnabledCategories(
				feed.references,
				enabledSubjectsSnapshot,
				enabledTopicsSnapshot
			).filter(
				(reference) => !queuedReferenceIds.has(reference.id) && reference.id !== currentReferenceId
			);

			if (newReferences.length > 0) {
				setReferenceQueue([...referenceQueue, ...newReferences]);
				rememberAvoidanceReferences(newReferences);
			}
		} catch (cause) {
			if (abortController.signal.aborted || requestGeneration !== referenceFeedRequestGeneration) {
				return;
			}

			if (referenceQueue.length === 0) {
				errorMessage = cause instanceof Error ? cause.message : 'Could not load more references.';
			}
		} finally {
			if (activeQueueRefillAbortController === abortController) {
				activeQueueRefillAbortController = undefined;
				isRefillingQueue = false;
			}
		}
	}

	async function loadImmediateFallbackReference(
		requestGeneration: number,
		enabledSubjectsSnapshot: readonly ReferenceSubjectId[],
		enabledTopicsSnapshot: readonly ReferenceTopicId[]
	): Promise<DrawingReference | undefined> {
		const currentReferenceId = currentReference?.id;
		const feed = await requestReferenceFeed(
			{
				count: 1,
				currentReferenceId,
				recentReferenceIds: avoidanceReferenceIds,
				recentReferences: avoidanceReferenceContexts,
				precedingReferences: getPrecedingReferenceContexts(),
				preferences: {
					enabledSubjects: enabledSubjectsSnapshot,
					enabledTopics: enabledTopicsSnapshot
				}
			},
			{ fetch, basePath: base }
		);

		if (
			requestGeneration !== referenceFeedRequestGeneration ||
			!areReferenceSubjectSelectionsEqual(enabledSubjectsSnapshot, enabledSubjects) ||
			!areReferenceTopicSelectionsEqual(
				enabledTopicsSnapshot,
				enabledTopics,
				enabledSubjectsSnapshot
			)
		) {
			return undefined;
		}

		return filterReferencesByEnabledCategories(
			feed.references,
			enabledSubjectsSnapshot,
			enabledTopicsSnapshot
		)[0];
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
		const enabledSubjectsSnapshot = normalizeReferenceSubjects(enabledSubjects);
		const enabledTopicsSnapshot = normalizeReferenceTopics(enabledTopics, enabledSubjectsSnapshot);
		const subjectSafeQueue = filterReferencesByEnabledCategories(
			referenceQueue,
			enabledSubjectsSnapshot,
			enabledTopicsSnapshot
		);
		const [queuedReference, ...remainingQueue] = subjectSafeQueue;

		if (subjectSafeQueue.length !== referenceQueue.length) {
			setReferenceQueue(subjectSafeQueue);
		}

		if (queuedReference !== undefined) {
			await appendDisplayedReferenceToTimeline(queuedReference);
			setReferenceQueue(remainingQueue);
			rememberAvoidanceReferences([previousReference, queuedReference]);
			void ensureReferenceQueueFilled();
			return;
		}

		isLoadingReference = true;
		const requestGeneration = referenceFeedRequestGeneration;

		try {
			const nextReference = await loadImmediateFallbackReference(
				requestGeneration,
				enabledSubjectsSnapshot,
				enabledTopicsSnapshot
			);

			if (!nextReference) {
				if (requestGeneration !== referenceFeedRequestGeneration) {
					return;
				}

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

<svelte:window onkeydown={handleWindowKeydown} />

<main
	class="mx-auto grid h-dvh w-full max-w-[1200px] grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-3 p-3 sm:p-4"
>
	<header class="flex min-w-0 items-center justify-between gap-3">
		<p class="m-0 flex items-baseline gap-1.5 truncate text-lg tracking-tight text-gray-900">
			<span aria-hidden="true">✏️</span>
			<span>
				<span class="font-semibold">Draw</span><span class="font-serif text-xl italic">This</span>
			</span>
		</p>
		{#if categoryFilterStorageIsReady}
			<CategoryFilter bind:enabledSubjects bind:enabledTopics />
		{/if}
	</header>

	<section
		class="grid min-h-0 w-full min-w-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm"
		aria-labelledby="reference-heading"
	>
		{#if !isReady}
			<div class="p-4" aria-live="polite">
				<h1 id="reference-heading" class="m-0 text-base leading-tight text-gray-500">
					Loading references…
				</h1>
			</div>
		{:else if currentReference}
			<div class="grid min-w-0 gap-2 border-b border-gray-200 px-4 py-3" aria-live="polite">
				<div class="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
					<h1
						id="reference-heading"
						class="m-0 flex min-w-0 items-center gap-1.5 text-lg leading-tight font-semibold"
					>
						<svg
							class="size-5 shrink-0 text-gray-400"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" />
							<circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
						</svg>
						<span class="truncate">{currentReferenceLabel}</span>
					</h1>

					<div class="flex shrink-0 items-center gap-2 max-sm:grid max-sm:grid-cols-2">
						<button
							type="button"
							class="min-h-11 cursor-pointer rounded-lg border border-gray-900 bg-white px-4 font-bold text-gray-900 transition-colors hover:bg-gray-100 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full"
							disabled={!canGoBack}
							onclick={showPreviousReference}
						>
							Back
						</button>

						<button
							type="button"
							class="min-h-11 cursor-pointer rounded-lg border border-gray-900 bg-gray-900 px-4 font-bold text-white transition-colors hover:bg-gray-700 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full"
							class:cursor-wait={isLoadingReference && isAtTimelineTail}
							disabled={!canGoNext}
							onclick={showNextReference}
						>
							{isLoadingReference && isAtTimelineTail ? 'Loading…' : 'Next'}
						</button>
					</div>
				</div>

				{#if errorMessage}
					<p class="m-0 text-sm text-red-800">{errorMessage}</p>
				{/if}
			</div>

			<figure class="m-0 grid min-h-0 min-w-0 grid-cols-1 grid-rows-[minmax(0,1fr)_auto]">
				<div class="relative min-h-0 bg-[#f7f7f4]">
					<img
						class="h-full w-full object-contain transition-opacity duration-200"
						class:opacity-0={!isImageLoaded}
						src={currentImageUrl}
						alt={currentReference.image.alt}
						onload={() => (loadedImageUrl = currentImageUrl)}
						onerror={() => (loadedImageUrl = currentImageUrl)}
					/>

					{#if !isImageLoaded}
						<DelayedSpinner />
					{/if}
				</div>

				<figcaption
					class="flex items-baseline gap-4 border-t border-gray-200 px-4 py-3 text-sm text-gray-600"
				>
					<span
						class="min-w-0 flex-1 truncate text-gray-900"
						data-testid="reference-description"
						title={currentReference.title}>{currentReference.title}</span
					>
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a
						class="shrink-0 whitespace-nowrap text-gray-600 underline underline-offset-2 hover:text-gray-900 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-blue-600"
						href={currentSourceUrl}
						target="_blank"
						rel="noopener noreferrer"
					>
						{currentSourceCredit}
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				</figcaption>
			</figure>
		{:else}
			<div class="p-4" aria-live="polite">
				<h1 id="reference-heading" class="m-0 text-base leading-tight">No references available</h1>
				<p class="mt-1 text-sm text-gray-600">Try again later.</p>
			</div>
		{/if}
	</section>
</main>

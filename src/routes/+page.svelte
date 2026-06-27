<script lang="ts">
	import { asset, base } from '$app/paths';
	import {
		appendReferenceHistoryEntry,
		appendReferenceTimelineEntry,
		areReferenceSubjectSelectionsEqual,
		areReferenceTopicSelectionsEqual,
		createReferenceCategorySelectionSnapshot,
		createReferenceCategoryFilterSelection,
		createReferenceTimelineEntry,
		createReferenceTimelineTabId,
		filterReferencesByCategorySelectionSnapshot,
		formatReferenceFeedErrorMessage,
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
		getReferenceCategorySelectionKey,
		isReferenceInCategorySelectionSnapshot,
		setLastViewedReferenceHistoryEntryId,
		toReferenceFeedContextItem,
		type DrawingReference,
		type ReferenceCategorySelectionSnapshot,
		type ReferenceSubjectId,
		type ReferenceTopicId,
		type ReferenceFeedContextItem,
		type ReferenceTabTimelineState,
		type ReferenceTimelineEntry
	} from '$lib/references';
	import { trackReferenceImageViewed } from '$lib/analytics/rybbit';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import DelayedSpinner from '$lib/components/DelayedSpinner.svelte';
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	// svelte-ignore state_referenced_locally
	const initialReferences = data.references;
	// svelte-ignore state_referenced_locally
	const initialFeedErrorMessage = data.initialFeedErrorMessage;

	let enabledSubjects = $state<ReferenceSubjectId[]>([...referenceSubjects]);
	let enabledTopics = $state<ReferenceTopicId[]>([...referenceTopics]);
	let categoryFilterStorageIsReady = $state(false);

	let currentReference = $state<DrawingReference | undefined>();
	let referenceQueue = $state<DrawingReference[]>(initialReferences.slice(1));
	let referenceQueueCategoryKey = $state(getCategoryFilterKey(referenceSubjects, referenceTopics));
	let avoidanceReferenceIds = $state<string[]>([]);
	let avoidanceReferenceContexts = $state<ReferenceFeedContextItem[]>([]);
	let referenceTimelineEntries = $state<ReferenceTimelineEntry[]>([]);
	let referenceTimelineCursorIndex = $state(-1);
	let activeTimelineTabId = '';
	let preloadedReferenceIds: string[] = [];
	let isReady = $state(false);
	let isLoadingReference = $state(false);
	let isRefillingQueue = $state(false);
	let errorMessage = $state<string | undefined>(
		initialFeedErrorMessage === undefined
			? undefined
			: formatReferenceFeedErrorMessage(initialFeedErrorMessage)
	);
	let referenceFeedRequestGeneration = 0;
	let pendingNextViewedReference = $state<DrawingReference | undefined>();
	let activeCategoryFilterKey = getCategoryFilterKey(referenceSubjects, referenceTopics);
	let activeQueueRefillAbortController: AbortController | undefined;
	let activeImmediateReferenceAbortController: AbortController | undefined;
	const trackedNextViewedImageUrls = new SvelteSet<string>();
	const successfullyLoadedImageUrls = new SvelteSet<string>();
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
		flushPendingNextViewedReferenceAnalytics();
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
		return getReferenceCategorySelectionKey(subjects, topics);
	}

	function createActiveReferenceCategorySelection(
		subjects: readonly ReferenceSubjectId[] = enabledSubjects,
		topics: readonly ReferenceTopicId[] = enabledTopics
	): ReferenceCategorySelectionSnapshot {
		return createReferenceCategorySelectionSnapshot(subjects, topics);
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

	function scheduleNextViewedReferenceAnalytics(reference: DrawingReference): void {
		const imageUrl = resolveReferenceUrl(reference.image.url);

		if (trackedNextViewedImageUrls.has(imageUrl)) {
			return;
		}

		pendingNextViewedReference = reference;
		flushPendingNextViewedReferenceAnalytics();
	}

	function flushPendingNextViewedReferenceAnalytics(): void {
		const reference = pendingNextViewedReference;

		if (reference === undefined || reference.id !== currentReference?.id) {
			return;
		}

		const imageUrl = resolveReferenceUrl(reference.image.url);

		if (!successfullyLoadedImageUrls.has(imageUrl) || trackedNextViewedImageUrls.has(imageUrl)) {
			return;
		}

		trackedNextViewedImageUrls.add(imageUrl);
		pendingNextViewedReference = undefined;
		trackReferenceImageViewed(reference, imageUrl);
	}

	function handleCurrentImageLoad(): void {
		loadedImageUrl = currentImageUrl;

		if (currentImageUrl.length === 0) {
			return;
		}

		successfullyLoadedImageUrls.add(currentImageUrl);
		flushPendingNextViewedReferenceAnalytics();
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

	function referenceMatchesCategorySelection(
		reference: DrawingReference,
		selection: ReferenceCategorySelectionSnapshot
	): boolean {
		return isReferenceInCategorySelectionSnapshot(reference, selection);
	}

	function filterReferencesByCategorySelection(
		references: readonly DrawingReference[],
		selection: ReferenceCategorySelectionSnapshot
	): DrawingReference[] {
		return filterReferencesByCategorySelectionSnapshot(references, selection);
	}

	function branchReferenceTimelineAtCurrentReference(): void {
		if (referenceTimelineCursorIndex < 0 || isAtTimelineTail) {
			return;
		}

		referenceTimelineEntries = referenceTimelineEntries.slice(0, referenceTimelineCursorIndex + 1);
		persistReferenceTimeline();
	}

	function cancelActiveReferenceFeedRequests(): void {
		referenceFeedRequestGeneration += 1;
		activeQueueRefillAbortController?.abort();
		activeImmediateReferenceAbortController?.abort();
		activeQueueRefillAbortController = undefined;
		activeImmediateReferenceAbortController = undefined;
		isRefillingQueue = false;
		isLoadingReference = false;
	}

	function handleNoCategoriesSelected(): void {
		const emptyCategoryFilterKey = getCategoryFilterKey([], []);

		if (activeCategoryFilterKey !== emptyCategoryFilterKey) {
			cancelActiveReferenceFeedRequests();
			activeCategoryFilterKey = emptyCategoryFilterKey;
			setReferenceQueue([], emptyCategoryFilterKey);
		}

		errorMessage = undefined;
	}

	function handleEnabledCategoriesChanged(
		subjects: readonly ReferenceSubjectId[],
		topics: readonly ReferenceTopicId[]
	): void {
		const selection = createActiveReferenceCategorySelection(subjects, topics);

		cancelActiveReferenceFeedRequests();
		errorMessage = undefined;

		branchReferenceTimelineAtCurrentReference();
		setReferenceQueue([], selection.key);

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

	function showTimelineEntry(
		index: number,
		options: { trackNextViewedImage?: boolean } = {}
	): void {
		const timelineEntry = referenceTimelineEntries[index];

		if (timelineEntry === undefined) {
			return;
		}

		referenceTimelineCursorIndex = index;
		currentReference = timelineEntry.reference;
		persistReferenceTimeline();
		void rememberLastViewedTimelineEntry();

		if (options.trackNextViewedImage === true) {
			scheduleNextViewedReferenceAnalytics(timelineEntry.reference);
		}
	}

	function getPrecedingReferenceContexts(
		selection: ReferenceCategorySelectionSnapshot | undefined = undefined
	): ReferenceFeedContextItem[] {
		const queuedReferences =
			selection === undefined ? referenceQueue : getCategoryScopedReferenceQueue(selection);

		return [currentReference, ...queuedReferences]
			.filter((reference): reference is DrawingReference => reference !== undefined)
			.map(toReferenceFeedContextItem);
	}

	function setReferenceQueue(
		nextQueue: DrawingReference[],
		categoryKey = activeCategoryFilterKey
	): void {
		const queuedReferenceIds = new Set(nextQueue.map((reference) => reference.id));

		referenceQueue = nextQueue;
		referenceQueueCategoryKey = categoryKey;
		preloadedReferenceIds = preloadedReferenceIds.filter((referenceId) =>
			queuedReferenceIds.has(referenceId)
		);
		preloadQueuedImages();
	}

	function getCategoryScopedReferenceQueue(
		selection: ReferenceCategorySelectionSnapshot
	): DrawingReference[] {
		if (referenceQueueCategoryKey !== selection.key) {
			setReferenceQueue([], selection.key);
			return [];
		}

		const categorySafeQueue = filterReferencesByCategorySelection(referenceQueue, selection);

		if (categorySafeQueue.length !== referenceQueue.length) {
			setReferenceQueue(categorySafeQueue, selection.key);
		}

		return categorySafeQueue;
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

		const selectionSnapshot = createActiveReferenceCategorySelection();
		const scopedQueue = getCategoryScopedReferenceQueue(selectionSnapshot);

		if (!options.force && scopedQueue.length > referenceQueueLowWatermark) {
			return;
		}

		if (scopedQueue.length >= referenceQueueTargetSize) {
			return;
		}

		const requestGeneration = referenceFeedRequestGeneration;
		const abortController = new AbortController();
		const currentReferenceId = currentReference?.id;

		isRefillingQueue = true;
		activeQueueRefillAbortController = abortController;

		try {
			const requestedCount = Math.max(referenceQueueTargetSize - scopedQueue.length, 1);
			const feed = await requestReferenceFeed(
				{
					count: requestedCount,
					currentReferenceId,
					recentReferenceIds: avoidanceReferenceIds,
					recentReferences: avoidanceReferenceContexts,
					precedingReferences: getPrecedingReferenceContexts(selectionSnapshot),
					preferences: {
						enabledSubjects: selectionSnapshot.subjects,
						enabledTopics: selectionSnapshot.topics
					}
				},
				{ fetch, basePath: base, signal: abortController.signal }
			);

			if (
				requestGeneration !== referenceFeedRequestGeneration ||
				selectionSnapshot.key !== createActiveReferenceCategorySelection().key
			) {
				return;
			}

			const currentScopedQueue = getCategoryScopedReferenceQueue(selectionSnapshot);
			const queuedReferenceIds = new Set(currentScopedQueue.map((reference) => reference.id));
			const newReferences = filterReferencesByCategorySelection(
				feed.references,
				selectionSnapshot
			).filter(
				(reference) => !queuedReferenceIds.has(reference.id) && reference.id !== currentReferenceId
			);

			if (newReferences.length > 0) {
				setReferenceQueue([...currentScopedQueue, ...newReferences], selectionSnapshot.key);
				rememberAvoidanceReferences(newReferences);
			}
		} catch (cause) {
			if (abortController.signal.aborted || requestGeneration !== referenceFeedRequestGeneration) {
				return;
			}

			if (referenceQueue.length === 0) {
				errorMessage =
					cause instanceof Error
						? formatReferenceFeedErrorMessage(cause.message)
						: 'Could not load more references.';
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
		selectionSnapshot: ReferenceCategorySelectionSnapshot,
		signal: AbortSignal
	): Promise<DrawingReference | undefined> {
		const currentReferenceId = currentReference?.id;
		const feed = await requestReferenceFeed(
			{
				count: 1,
				currentReferenceId,
				recentReferenceIds: avoidanceReferenceIds,
				recentReferences: avoidanceReferenceContexts,
				precedingReferences: getPrecedingReferenceContexts(selectionSnapshot),
				preferences: {
					enabledSubjects: selectionSnapshot.subjects,
					enabledTopics: selectionSnapshot.topics
				}
			},
			{ fetch, basePath: base, signal }
		);

		if (
			requestGeneration !== referenceFeedRequestGeneration ||
			selectionSnapshot.key !== createActiveReferenceCategorySelection().key
		) {
			return undefined;
		}

		return filterReferencesByCategorySelection(feed.references, selectionSnapshot)[0];
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

		const selectionSnapshot = createActiveReferenceCategorySelection();

		if (!isAtTimelineTail) {
			const forwardReference =
				referenceTimelineEntries[referenceTimelineCursorIndex + 1]?.reference;

			if (
				forwardReference !== undefined &&
				referenceMatchesCategorySelection(forwardReference, selectionSnapshot)
			) {
				showTimelineEntry(referenceTimelineCursorIndex + 1, { trackNextViewedImage: true });
				return;
			}

			branchReferenceTimelineAtCurrentReference();
		}

		const previousReference = currentReference;
		const categoryScopedQueue = getCategoryScopedReferenceQueue(selectionSnapshot);
		const [queuedReference, ...remainingQueue] = categoryScopedQueue;

		if (queuedReference !== undefined) {
			await appendDisplayedReferenceToTimeline(queuedReference);
			scheduleNextViewedReferenceAnalytics(queuedReference);
			setReferenceQueue(remainingQueue, selectionSnapshot.key);
			rememberAvoidanceReferences([previousReference, queuedReference]);
			void ensureReferenceQueueFilled();
			return;
		}

		isLoadingReference = true;
		const requestGeneration = referenceFeedRequestGeneration;
		const abortController = new AbortController();
		activeImmediateReferenceAbortController = abortController;

		try {
			const nextReference = await loadImmediateFallbackReference(
				requestGeneration,
				selectionSnapshot,
				abortController.signal
			);

			if (!nextReference) {
				if (requestGeneration !== referenceFeedRequestGeneration) {
					return;
				}

				throw new Error('No references are available right now.');
			}

			await appendDisplayedReferenceToTimeline(nextReference);
			scheduleNextViewedReferenceAnalytics(nextReference);
			rememberAvoidanceReferences([previousReference, nextReference]);
			void ensureReferenceQueueFilled();
		} catch (cause) {
			if (abortController.signal.aborted || requestGeneration !== referenceFeedRequestGeneration) {
				return;
			}

			errorMessage =
				cause instanceof Error
					? formatReferenceFeedErrorMessage(cause.message)
					: 'Could not load the next reference.';
		} finally {
			if (activeImmediateReferenceAbortController === abortController) {
				activeImmediateReferenceAbortController = undefined;
			}

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
	class="mx-auto grid h-(--drawthis-viewport-height,100dvh) w-full max-w-[1200px] grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-3 px-3 pt-3 pb-1 sm:p-4"
>
	<header class="flex min-w-0 items-center justify-between gap-3">
		<p
			class="m-0 flex min-w-0 items-baseline gap-1.5 truncate text-lg tracking-tight text-gray-900"
		>
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
				<div
					class="flex min-w-0 items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch"
				>
					<h1
						id="reference-heading"
						class="m-0 flex min-w-0 items-center gap-1.5 overflow-hidden text-lg leading-tight font-semibold"
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
						<span class="min-w-0 flex-1 truncate">{currentReferenceLabel}</span>
					</h1>

					<div
						class="flex min-w-0 shrink-0 items-center gap-2 max-sm:grid max-sm:w-full max-sm:grid-cols-2"
					>
						<button
							type="button"
							class="min-h-11 min-w-0 cursor-pointer rounded-lg border border-gray-900 bg-white px-4 font-bold text-gray-900 transition-colors hover:bg-gray-100 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full"
							disabled={!canGoBack}
							onclick={showPreviousReference}
						>
							Back
						</button>

						<button
							type="button"
							class="min-h-11 min-w-0 cursor-pointer rounded-lg border border-gray-900 bg-gray-900 px-4 font-bold text-white transition-colors hover:bg-gray-700 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full"
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
				<div class="relative min-h-0 bg-[#f9f9f9]">
					<img
						class="h-full w-full object-contain transition-opacity duration-200"
						class:opacity-0={!isImageLoaded}
						src={currentImageUrl}
						alt={currentReference.image.alt}
						onload={handleCurrentImageLoad}
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
				<p class="mt-1 text-sm text-gray-600">
					{errorMessage ?? 'Try again later.'}
				</p>
			</div>
		{/if}
	</section>
</main>

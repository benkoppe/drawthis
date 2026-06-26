<script lang="ts">
	import {
		getReferenceSubjectTopics,
		normalizeReferenceSubjects,
		normalizeReferenceTopics,
		referenceSubjectLabels,
		referenceSubjects,
		referenceTopicLabels,
		referenceTopics,
		referenceTopicsBySubject,
		type ReferenceSubjectId,
		type ReferenceTopicId
	} from '$lib/references';

	let {
		enabledSubjects = $bindable(),
		enabledTopics = $bindable()
	}: { enabledSubjects: ReferenceSubjectId[]; enabledTopics: ReferenceTopicId[] } = $props();

	let isOpen = $state(false);
	let expandedSubjects = $state<ReferenceSubjectId[]>([]);
	let wrapper = $state<HTMLElement>();
	let triggerButton = $state<HTMLButtonElement>();
	let allCategoriesCheckbox = $state<HTMLInputElement>();
	let subjectCheckboxes: Partial<Record<ReferenceSubjectId, HTMLInputElement>> = {};

	let normalizedEnabledSubjects = $derived(normalizeReferenceSubjects(enabledSubjects));
	let normalizedEnabledTopics = $derived(
		normalizeReferenceTopics(enabledTopics, normalizedEnabledSubjects)
	);
	let allSelected = $derived(normalizedEnabledTopics.length === referenceTopics.length);
	let noneSelected = $derived(normalizedEnabledTopics.length === 0);
	let selectedSubjectCount = $derived(normalizedEnabledSubjects.length);
	let summaryLabel = $derived(getSummaryLabel());

	function getSummaryLabel(): string {
		if (allSelected) {
			return 'All categories';
		}

		if (noneSelected) {
			return 'No categories';
		}

		if (selectedSubjectCount === 1) {
			const [subject] = normalizedEnabledSubjects;

			return subject === undefined ? 'No categories' : referenceSubjectLabels[subject];
		}

		if (selectedSubjectCount === 2) {
			return normalizedEnabledSubjects
				.map((subject) => referenceSubjectLabels[subject])
				.join(' + ');
		}

		return `${selectedSubjectCount} categories`;
	}

	function open(): void {
		isOpen = true;
	}

	function close(): void {
		isOpen = false;
	}

	function toggleOpen(): void {
		if (isOpen) {
			close();
		} else {
			open();
		}
	}

	function getTopicGroupId(subject: ReferenceSubjectId): string {
		return `reference-category-topics-${subject}`;
	}

	function isSubjectExpanded(subject: ReferenceSubjectId): boolean {
		return expandedSubjects.includes(subject);
	}

	function toggleSubjectExpanded(subject: ReferenceSubjectId): void {
		expandedSubjects = isSubjectExpanded(subject)
			? expandedSubjects.filter((candidate) => candidate !== subject)
			: [...expandedSubjects, subject];
	}

	function getEnabledTopicCount(subject: ReferenceSubjectId): number {
		return getReferenceSubjectTopics(subject).filter((topic) =>
			normalizedEnabledTopics.includes(topic)
		).length;
	}

	function getSubjectTopicSummary(subject: ReferenceSubjectId): string {
		const enabledTopicCount = getEnabledTopicCount(subject);
		const totalTopicCount = referenceTopicsBySubject[subject].length;

		return `${enabledTopicCount}/${totalTopicCount}`;
	}

	function isSubjectFullyEnabled(subject: ReferenceSubjectId): boolean {
		return getEnabledTopicCount(subject) === referenceTopicsBySubject[subject].length;
	}

	function isSubjectPartiallyEnabled(subject: ReferenceSubjectId): boolean {
		const count = getEnabledTopicCount(subject);

		return count > 0 && count < referenceTopicsBySubject[subject].length;
	}

	$effect(() => {
		if (allCategoriesCheckbox !== undefined) {
			allCategoriesCheckbox.indeterminate = !allSelected && !noneSelected;
		}

		for (const subject of referenceSubjects) {
			const checkbox = subjectCheckboxes[subject];

			if (checkbox !== undefined) {
				checkbox.indeterminate = isSubjectPartiallyEnabled(subject);
			}
		}
	});

	function isTopicEnabled(topic: ReferenceTopicId): boolean {
		return normalizedEnabledTopics.includes(topic);
	}

	function setSelection(nextTopics: readonly ReferenceTopicId[]): void {
		const normalizedTopics = normalizeReferenceTopics(nextTopics);
		const nextSubjects = normalizeReferenceSubjects(
			referenceSubjects.filter((subject) =>
				getReferenceSubjectTopics(subject).some((topic) => normalizedTopics.includes(topic))
			)
		);

		enabledSubjects = nextSubjects;
		enabledTopics = normalizeReferenceTopics(normalizedTopics, nextSubjects);
	}

	function setAllEnabled(shouldEnable: boolean): void {
		if (shouldEnable) {
			enabledSubjects = [...referenceSubjects];
			enabledTopics = [...referenceTopics];
			return;
		}

		enabledSubjects = [];
		enabledTopics = [];
	}

	function setSubjectEnabled(subject: ReferenceSubjectId, shouldEnable: boolean): void {
		const subjectTopics = getReferenceSubjectTopics(subject);
		const subjectTopicSet = new Set(subjectTopics);
		const nextTopics = shouldEnable
			? [...normalizedEnabledTopics, ...subjectTopics]
			: normalizedEnabledTopics.filter((topic) => !subjectTopicSet.has(topic));

		setSelection(nextTopics);
	}

	function setTopicEnabled(topic: ReferenceTopicId, shouldEnable: boolean): void {
		setSelection(
			shouldEnable
				? [...normalizedEnabledTopics, topic]
				: normalizedEnabledTopics.filter((candidate) => candidate !== topic)
		);
	}

	function handleWindowPointerDown(event: PointerEvent): void {
		if (
			isOpen &&
			wrapper !== undefined &&
			event.target instanceof Node &&
			!wrapper.contains(event.target)
		) {
			close();
		}
	}

	function handleWindowKeydown(event: KeyboardEvent): void {
		if (isOpen && event.key === 'Escape') {
			event.preventDefault();
			close();
			triggerButton?.focus();
		}
	}
</script>

<svelte:window onpointerdown={handleWindowPointerDown} onkeydown={handleWindowKeydown} />

<div
	class="relative"
	{@attach (node) => {
		wrapper = node;
		return () => (wrapper = undefined);
	}}
>
	<button
		{@attach (node) => {
			triggerButton = node;
			return () => (triggerButton = undefined);
		}}
		type="button"
		class="flex min-h-7 min-w-36 cursor-pointer items-center justify-center gap-1 rounded-md border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
		class:border-red-500={noneSelected}
		class:text-red-800={noneSelected}
		aria-haspopup="true"
		aria-expanded={isOpen}
		onclick={toggleOpen}
	>
		<svg
			class="size-3.5 shrink-0 text-gray-400"
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
		{summaryLabel}
		<svg
			class="size-3.5 text-gray-400 transition-transform {isOpen ? 'rotate-180' : ''}"
			viewBox="0 0 20 20"
			fill="none"
			stroke="currentColor"
			stroke-width="1.75"
			aria-hidden="true"
		>
			<path d="m5 7.5 5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</button>

	{#if isOpen}
		<div
			class="absolute top-full right-0 z-20 mt-2 max-h-[min(34rem,calc(100dvh-5rem))] w-72 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
			role="group"
			aria-label="Limit reference categories"
		>
			<label
				class="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
			>
				<input
					type="checkbox"
					class="size-4 accent-gray-900"
					checked={allSelected}
					{@attach (node) => {
						allCategoriesCheckbox = node;
						return () => (allCategoriesCheckbox = undefined);
					}}
					onchange={(event) => setAllEnabled(event.currentTarget.checked)}
				/>
				All categories
			</label>

			<hr class="my-2 border-gray-300" />

			{#each referenceSubjects as subject (subject)}
				<div class="rounded-md py-1">
					<div class="flex items-center gap-1 rounded-md hover:bg-gray-50">
						<label
							class="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md py-1.5 pr-1 pl-2.5 text-sm font-semibold text-gray-900"
						>
							<input
								type="checkbox"
								class="size-4 accent-gray-900"
								checked={isSubjectFullyEnabled(subject)}
								{@attach (node) => {
									subjectCheckboxes[subject] = node;
									return () => {
										delete subjectCheckboxes[subject];
									};
								}}
								onchange={(event) => setSubjectEnabled(subject, event.currentTarget.checked)}
							/>
							<span class="truncate">{referenceSubjectLabels[subject]}</span>
							<span class="ml-auto text-xs font-normal text-gray-400">
								{getSubjectTopicSummary(subject)}
							</span>
						</label>

						<button
							type="button"
							class="mr-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
							aria-label="{isSubjectExpanded(subject)
								? 'Collapse'
								: 'Expand'} {referenceSubjectLabels[subject]} subcategories"
							aria-expanded={isSubjectExpanded(subject)}
							aria-controls={getTopicGroupId(subject)}
							onclick={() => toggleSubjectExpanded(subject)}
						>
							<svg
								class="size-4 transition-transform {isSubjectExpanded(subject) ? 'rotate-180' : ''}"
								viewBox="0 0 20 20"
								fill="none"
								stroke="currentColor"
								stroke-width="1.75"
								aria-hidden="true"
							>
								<path d="m5 7.5 5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</button>
					</div>

					{#if isSubjectExpanded(subject)}
						<div id={getTopicGroupId(subject)} class="mt-0.5 grid gap-0.5 pl-8">
							{#each referenceTopicsBySubject[subject] as topic (topic)}
								<label
									class="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
								>
									<input
										type="checkbox"
										class="size-3.5 accent-gray-900"
										checked={isTopicEnabled(topic)}
										onchange={(event) => setTopicEnabled(topic, event.currentTarget.checked)}
									/>
									{referenceTopicLabels[topic]}
								</label>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

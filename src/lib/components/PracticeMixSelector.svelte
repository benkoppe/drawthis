<script lang="ts">
	import {
		createReferencePracticeMixSelection,
		normalizeReferenceSubjects,
		referencePracticeMixPresets,
		referenceSubjectLabels,
		referenceSubjects,
		type ReferencePracticeMixMode,
		type ReferenceSubjectId
	} from '$lib/references';

	let {
		enabledSubjects = $bindable(),
		mode = $bindable('balanced')
	}: { enabledSubjects: ReferenceSubjectId[]; mode: ReferencePracticeMixMode } = $props();

	let isOpen = $state(false);
	let wrapper = $state<HTMLElement>();
	let triggerButton = $state<HTMLButtonElement>();
	let allSubjectsCheckbox = $state<HTMLInputElement>();

	let normalizedEnabledSubjects = $derived(normalizeReferenceSubjects(enabledSubjects));
	let allSelected = $derived(normalizedEnabledSubjects.length === referenceSubjects.length);
	let noneSelected = $derived(normalizedEnabledSubjects.length === 0);
	let selectedSubjectCount = $derived(normalizedEnabledSubjects.length);
	let selectedPreset = $derived(referencePracticeMixPresets.find((preset) => preset.mode === mode));
	let summaryLabel = $derived(
		mode === 'custom'
			? allSelected
				? 'Custom: all subjects'
				: noneSelected
					? 'No subjects'
					: `Custom: ${selectedSubjectCount} of ${referenceSubjects.length}`
			: (selectedPreset?.label ?? 'Balanced practice')
	);

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

	$effect(() => {
		if (allSubjectsCheckbox !== undefined) {
			allSubjectsCheckbox.indeterminate = !allSelected && !noneSelected;
		}
	});

	function isSubjectEnabled(subject: ReferenceSubjectId): boolean {
		return normalizedEnabledSubjects.includes(subject);
	}

	function selectPreset(nextMode: Exclude<ReferencePracticeMixMode, 'custom'>): void {
		const selection = createReferencePracticeMixSelection(nextMode);
		mode = selection.mode;
		enabledSubjects = selection.enabledSubjects;
		close();
	}

	function setSubjectEnabled(subject: ReferenceSubjectId, shouldEnable: boolean): void {
		mode = 'custom';
		enabledSubjects = shouldEnable
			? normalizeReferenceSubjects([...normalizedEnabledSubjects, subject])
			: normalizedEnabledSubjects.filter((candidate) => candidate !== subject);
	}

	function setAllEnabled(shouldEnable: boolean): void {
		mode = 'custom';
		enabledSubjects = shouldEnable ? [...referenceSubjects] : [];
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
		class="flex min-h-7 min-w-40 cursor-pointer items-center justify-center gap-1 rounded-md border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
		class:border-red-500={noneSelected}
		class:text-red-800={noneSelected}
		aria-haspopup="true"
		aria-expanded={isOpen}
		data-practice-mix-mode={mode}
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
			<path d="M4 5h16" />
			<path d="M7 12h10" />
			<path d="M10 19h4" />
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
			class="absolute top-full right-0 z-20 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
			role="group"
			aria-label="Choose practice mix"
		>
			<p class="m-0 px-2.5 pt-2 pb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
				Practice mix
			</p>

			{#each referencePracticeMixPresets as preset (preset.mode)}
				<button
					type="button"
					class="grid w-full cursor-pointer gap-0.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
					class:bg-gray-100={mode === preset.mode}
					class:font-semibold={mode === preset.mode}
					onclick={() => selectPreset(preset.mode)}
				>
					<span class="text-gray-900">{preset.label}</span>
					<span class="text-xs font-normal text-gray-500">{preset.description}</span>
				</button>
			{/each}

			<hr class="my-1 border-gray-100" />

			<label
				class="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
			>
				<input
					type="checkbox"
					class="size-4 accent-gray-900"
					checked={allSelected}
					{@attach (node) => {
						allSubjectsCheckbox = node;
						return () => (allSubjectsCheckbox = undefined);
					}}
					onchange={(event) => setAllEnabled(event.currentTarget.checked)}
				/>
				Custom: all subjects
			</label>

			{#each referenceSubjects as subject (subject)}
				<label
					class="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-50"
				>
					<input
						type="checkbox"
						class="size-4 accent-gray-900"
						checked={isSubjectEnabled(subject)}
						onchange={(event) => setSubjectEnabled(subject, event.currentTarget.checked)}
					/>
					{referenceSubjectLabels[subject]}
				</label>
			{/each}
		</div>
	{/if}
</div>

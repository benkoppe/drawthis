<script lang="ts">
	import {
		normalizeReferenceCategories,
		referenceCategories,
		referenceCategoryLabels,
		type ReferenceCategory
	} from '$lib/references';

	let { enabled = $bindable() }: { enabled: ReferenceCategory[] } = $props();

	let isOpen = $state(false);
	let wrapper = $state<HTMLElement>();
	let triggerButton = $state<HTMLButtonElement>();
	let allCategoriesCheckbox = $state<HTMLInputElement>();

	let normalizedEnabled = $derived(normalizeReferenceCategories(enabled));
	let allSelected = $derived(normalizedEnabled.length === referenceCategories.length);
	let noneSelected = $derived(normalizedEnabled.length === 0);
	let selectedCategoryCount = $derived(normalizedEnabled.length);
	let summaryLabel = $derived(
		allSelected
			? 'All categories'
			: noneSelected
				? 'No categories'
				: `${selectedCategoryCount} of ${referenceCategories.length} categories`
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
		if (allCategoriesCheckbox !== undefined) {
			allCategoriesCheckbox.indeterminate = !allSelected && !noneSelected;
		}
	});

	function isCategoryEnabled(category: ReferenceCategory): boolean {
		return normalizedEnabled.includes(category);
	}

	function setCategoryEnabled(category: ReferenceCategory, shouldEnable: boolean): void {
		const nextEnabled = shouldEnable
			? normalizeReferenceCategories([...normalizedEnabled, category])
			: normalizedEnabled.filter((candidate) => candidate !== category);

		if (nextEnabled.length === 0) {
			return;
		}

		enabled = nextEnabled;
	}

	function setAllEnabled(shouldEnable: boolean): void {
		if (shouldEnable) {
			enabled = [...referenceCategories];
		}
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
		class="flex min-h-7 cursor-pointer items-center gap-1 rounded-md border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
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
			class="absolute top-full right-0 z-20 mt-2 w-60 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
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
					disabled={allSelected}
					{@attach (node) => {
						allCategoriesCheckbox = node;
						return () => (allCategoriesCheckbox = undefined);
					}}
					onchange={(event) => setAllEnabled(event.currentTarget.checked)}
				/>
				All categories
			</label>

			<hr class="my-1 border-gray-100" />

			{#each referenceCategories as category (category)}
				<label
					class="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-50"
				>
					<input
						type="checkbox"
						class="size-4 accent-gray-900"
						checked={isCategoryEnabled(category)}
						disabled={isCategoryEnabled(category) && selectedCategoryCount === 1}
						onchange={(event) => setCategoryEnabled(category, event.currentTarget.checked)}
					/>
					{referenceCategoryLabels[category]}
				</label>
			{/each}
		</div>
	{/if}
</div>

export const referenceCategories = [
	'interior',
	'street',
	'figure-study',
	'still-life',
	'plant'
] as const;

export type ReferenceCategory = (typeof referenceCategories)[number];

export type ReferenceCategoryFilterMode = 'all' | 'custom';

export interface ReferenceCategoryFilterSelection {
	mode: ReferenceCategoryFilterMode;
	enabledCategories: ReferenceCategory[];
}

export const referenceCategoryFilterStorageKey = 'drawthis:reference-category-filter';

export const referenceCategoryLabels = {
	interior: 'Interior',
	street: 'Street',
	'figure-study': 'Figure Study',
	'still-life': 'Still Life',
	plant: 'Plant'
} satisfies Record<ReferenceCategory, string>;

export function isReferenceCategory(value: unknown): value is ReferenceCategory {
	return typeof value === 'string' && referenceCategories.includes(value as ReferenceCategory);
}

export function normalizeReferenceCategories(
	categories: readonly ReferenceCategory[]
): ReferenceCategory[] {
	const selectedCategories = new Set(categories);

	return referenceCategories.filter((category) => selectedCategories.has(category));
}

export function getReferenceCategorySelectionKey(categories: readonly ReferenceCategory[]): string {
	return normalizeReferenceCategories(categories).join('\0');
}

export function areReferenceCategorySelectionsEqual(
	left: readonly ReferenceCategory[],
	right: readonly ReferenceCategory[]
): boolean {
	return getReferenceCategorySelectionKey(left) === getReferenceCategorySelectionKey(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function createReferenceCategoryFilterSelection(
	mode: ReferenceCategoryFilterMode,
	enabledCategories: readonly ReferenceCategory[]
): ReferenceCategoryFilterSelection {
	return mode === 'all'
		? { mode: 'all', enabledCategories: [...referenceCategories] }
		: { mode: 'custom', enabledCategories: normalizeReferenceCategories(enabledCategories) };
}

export function parseReferenceCategoryFilterSelection(
	value: string | null | undefined
): ReferenceCategoryFilterSelection | undefined {
	if (value === null || value === undefined || value.length === 0) {
		return undefined;
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(value);
	} catch {
		return undefined;
	}

	if (!isRecord(parsed)) {
		return undefined;
	}

	if (parsed.version !== 1) {
		return undefined;
	}

	if (parsed.mode === 'all') {
		return createReferenceCategoryFilterSelection('all', referenceCategories);
	}

	if (parsed.mode !== 'custom' || !Array.isArray(parsed.categories)) {
		return undefined;
	}

	return createReferenceCategoryFilterSelection(
		'custom',
		parsed.categories.filter(isReferenceCategory)
	);
}

export function serializeReferenceCategoryFilterSelection(
	selection: ReferenceCategoryFilterSelection
): string {
	if (selection.mode === 'all') {
		return JSON.stringify({ version: 1, mode: 'all' });
	}

	return JSON.stringify({
		version: 1,
		mode: 'custom',
		categories: normalizeReferenceCategories(selection.enabledCategories)
	});
}

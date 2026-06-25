export const referenceCategories = [
	'interior',
	'street',
	'figure-study',
	'still-life',
	'plant'
] as const;

export type ReferenceCategory = (typeof referenceCategories)[number];

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

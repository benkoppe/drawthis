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
	'figure-study': 'Figure study',
	'still-life': 'Still life',
	plant: 'Plant'
} satisfies Record<ReferenceCategory, string>;

export function isReferenceCategory(value: unknown): value is ReferenceCategory {
	return typeof value === 'string' && referenceCategories.includes(value as ReferenceCategory);
}

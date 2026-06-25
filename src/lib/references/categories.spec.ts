import { describe, expect, it } from 'vitest';
import {
	areReferenceCategorySelectionsEqual,
	getReferenceCategorySelectionKey,
	normalizeReferenceCategories,
	referenceCategories
} from './categories';

describe('reference category helpers', () => {
	it('normalizes category selections into canonical taxonomy order', () => {
		expect(normalizeReferenceCategories(['plant', 'street', 'street', 'interior'])).toEqual([
			'interior',
			'street',
			'plant'
		]);
	});

	it('builds stable selection keys from normalized categories', () => {
		expect(getReferenceCategorySelectionKey(['plant', 'street', 'street'])).toBe(`street\0plant`);
	});

	it('compares selections after canonicalization and deduplication', () => {
		expect(areReferenceCategorySelectionsEqual(['plant', 'street'], ['street', 'plant'])).toBe(
			true
		);
		expect(areReferenceCategorySelectionsEqual(['plant'], ['street', 'plant'])).toBe(false);
	});

	it('keeps the all-category selection in taxonomy order', () => {
		expect(normalizeReferenceCategories([...referenceCategories].reverse())).toEqual(
			referenceCategories
		);
	});
});

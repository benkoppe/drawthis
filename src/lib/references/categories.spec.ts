import { describe, expect, it } from 'vitest';
import {
	areReferenceCategorySelectionsEqual,
	createReferenceCategoryFilterSelection,
	getReferenceCategorySelectionKey,
	normalizeReferenceCategories,
	parseReferenceCategoryFilterSelection,
	referenceCategories,
	serializeReferenceCategoryFilterSelection
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

	it('round-trips all-category filter mode without storing a category snapshot', () => {
		const selection = createReferenceCategoryFilterSelection('all', ['plant']);
		const serialized = serializeReferenceCategoryFilterSelection(selection);

		expect(JSON.parse(serialized)).toEqual({ version: 1, mode: 'all' });
		expect(parseReferenceCategoryFilterSelection(serialized)).toEqual({
			mode: 'all',
			enabledCategories: referenceCategories
		});
	});

	it('round-trips custom category filters in canonical order', () => {
		const selection = createReferenceCategoryFilterSelection('custom', [
			'plant',
			'street',
			'plant'
		]);

		expect(
			parseReferenceCategoryFilterSelection(serializeReferenceCategoryFilterSelection(selection))
		).toEqual({ mode: 'custom', enabledCategories: ['street', 'plant'] });
	});

	it('preserves an empty custom category filter as an invalid UI state', () => {
		expect(
			parseReferenceCategoryFilterSelection(
				serializeReferenceCategoryFilterSelection({ mode: 'custom', enabledCategories: [] })
			)
		).toEqual({ mode: 'custom', enabledCategories: [] });
	});

	it('drops unsupported persisted custom categories', () => {
		expect(
			parseReferenceCategoryFilterSelection(
				JSON.stringify({
					version: 1,
					mode: 'custom',
					categories: ['plant', 'removed-category', 'street']
				})
			)
		).toEqual({ mode: 'custom', enabledCategories: ['street', 'plant'] });
	});

	it('ignores invalid persisted category filter values', () => {
		expect(parseReferenceCategoryFilterSelection('not json')).toBeUndefined();
		expect(
			parseReferenceCategoryFilterSelection(JSON.stringify({ version: 2, mode: 'all' }))
		).toBeUndefined();
		expect(
			parseReferenceCategoryFilterSelection(
				JSON.stringify({ version: 1, mode: 'custom', categories: 'plant' })
			)
		).toBeUndefined();
	});
});

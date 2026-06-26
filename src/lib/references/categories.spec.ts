import { describe, expect, it } from 'vitest';
import {
	areReferenceSubjectSelectionsEqual,
	areReferenceTopicSelectionsEqual,
	createReferenceCategoryFilterSelection,
	getReferenceSubjectSelectionKey,
	getReferenceTopicSelectionKey,
	normalizeReferenceSubjects,
	normalizeReferenceTopics,
	parseReferenceCategoryFilterSelection,
	referenceSubjects,
	referenceTopics,
	serializeReferenceCategoryFilterSelection
} from './taxonomy';

describe('reference taxonomy helpers', () => {
	it('normalizes subject selections into canonical taxonomy order', () => {
		expect(normalizeReferenceSubjects(['nature', 'places', 'places', 'people'])).toEqual([
			'people',
			'places',
			'nature'
		]);
	});

	it('normalizes topic selections into canonical taxonomy order and enabled subjects', () => {
		expect(
			normalizeReferenceTopics(
				['plants-flowers', 'rooms', 'rooms', 'hands-feet'],
				['places', 'nature']
			)
		).toEqual(['rooms', 'plants-flowers']);
	});

	it('builds stable selection keys from normalized subjects and topics', () => {
		expect(getReferenceSubjectSelectionKey(['nature', 'places', 'places'])).toBe(`places\0nature`);
		expect(getReferenceTopicSelectionKey(['plants-flowers', 'rooms'])).toBe(
			`rooms\0plants-flowers`
		);
	});

	it('compares selections after canonicalization and deduplication', () => {
		expect(areReferenceSubjectSelectionsEqual(['nature', 'places'], ['places', 'nature'])).toBe(
			true
		);
		expect(areReferenceSubjectSelectionsEqual(['nature'], ['places', 'nature'])).toBe(false);
		expect(
			areReferenceTopicSelectionsEqual(['rooms', 'plants-flowers'], ['plants-flowers', 'rooms'])
		).toBe(true);
	});

	it('keeps all-category selections in taxonomy order', () => {
		expect(normalizeReferenceSubjects([...referenceSubjects].reverse())).toEqual(referenceSubjects);
		expect(normalizeReferenceTopics([...referenceTopics].reverse())).toEqual(referenceTopics);
	});

	it('round-trips category filters in canonical order', () => {
		const selection = createReferenceCategoryFilterSelection(
			['nature', 'places', 'nature'],
			['plants-flowers', 'rooms', 'rooms']
		);

		expect(
			parseReferenceCategoryFilterSelection(serializeReferenceCategoryFilterSelection(selection))
		).toEqual({
			enabledSubjects: ['places', 'nature'],
			enabledTopics: ['rooms', 'plants-flowers']
		});
	});

	it('preserves an empty category filter as an invalid UI state', () => {
		expect(
			parseReferenceCategoryFilterSelection(
				serializeReferenceCategoryFilterSelection({ enabledSubjects: [], enabledTopics: [] })
			)
		).toEqual({ enabledSubjects: [], enabledTopics: [] });
	});

	it('drops unsupported persisted subjects and topics', () => {
		expect(
			parseReferenceCategoryFilterSelection(
				JSON.stringify({
					version: 1,
					subjects: ['nature', 'removed-subject', 'places'],
					topics: ['plants-flowers', 'removed-topic', 'rooms']
				})
			)
		).toEqual({
			enabledSubjects: ['places', 'nature'],
			enabledTopics: ['rooms', 'plants-flowers']
		});
	});

	it('ignores invalid persisted category filter values', () => {
		expect(parseReferenceCategoryFilterSelection('not json')).toBeUndefined();
		expect(
			parseReferenceCategoryFilterSelection(
				JSON.stringify({ version: 2, subjects: [], topics: [] })
			)
		).toBeUndefined();
		expect(
			parseReferenceCategoryFilterSelection(
				JSON.stringify({ version: 1, subjects: 'nature', topics: [] })
			)
		).toBeUndefined();
	});
});

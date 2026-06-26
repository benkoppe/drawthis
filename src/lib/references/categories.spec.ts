import { describe, expect, it } from 'vitest';
import {
	areReferenceSubjectSelectionsEqual,
	createReferencePracticeMixSelection,
	getReferenceSubjectSelectionKey,
	normalizeReferenceSubjects,
	parseReferencePracticeMixSelection,
	referenceSubjects,
	serializeReferencePracticeMixSelection
} from './taxonomy';

describe('reference taxonomy helpers', () => {
	it('normalizes subject selections into canonical taxonomy order', () => {
		expect(normalizeReferenceSubjects(['nature', 'places', 'places', 'people'])).toEqual([
			'people',
			'places',
			'nature'
		]);
	});

	it('builds stable selection keys from normalized subjects', () => {
		expect(getReferenceSubjectSelectionKey(['nature', 'places', 'places'])).toBe(`places\0nature`);
	});

	it('compares selections after canonicalization and deduplication', () => {
		expect(areReferenceSubjectSelectionsEqual(['nature', 'places'], ['places', 'nature'])).toBe(
			true
		);
		expect(areReferenceSubjectSelectionsEqual(['nature'], ['places', 'nature'])).toBe(false);
	});

	it('keeps all-subject selections in taxonomy order', () => {
		expect(normalizeReferenceSubjects([...referenceSubjects].reverse())).toEqual(referenceSubjects);
	});

	it('round-trips preset practice mixes without storing a subject snapshot', () => {
		const selection = createReferencePracticeMixSelection('balanced', ['nature']);
		const serialized = serializeReferencePracticeMixSelection(selection);

		expect(JSON.parse(serialized)).toEqual({ version: 1, mode: 'balanced' });
		expect(parseReferencePracticeMixSelection(serialized)).toEqual({
			mode: 'balanced',
			enabledSubjects: referenceSubjects
		});
	});

	it('round-trips custom subject filters in canonical order', () => {
		const selection = createReferencePracticeMixSelection('custom', ['nature', 'places', 'nature']);

		expect(
			parseReferencePracticeMixSelection(serializeReferencePracticeMixSelection(selection))
		).toEqual({ mode: 'custom', enabledSubjects: ['places', 'nature'] });
	});

	it('preserves an empty custom subject selection as an invalid UI state', () => {
		expect(
			parseReferencePracticeMixSelection(
				serializeReferencePracticeMixSelection({ mode: 'custom', enabledSubjects: [] })
			)
		).toEqual({ mode: 'custom', enabledSubjects: [] });
	});

	it('drops unsupported persisted custom subjects', () => {
		expect(
			parseReferencePracticeMixSelection(
				JSON.stringify({
					version: 1,
					mode: 'custom',
					subjects: ['nature', 'removed-subject', 'places']
				})
			)
		).toEqual({ mode: 'custom', enabledSubjects: ['places', 'nature'] });
	});

	it('ignores invalid persisted practice mix values', () => {
		expect(parseReferencePracticeMixSelection('not json')).toBeUndefined();
		expect(
			parseReferencePracticeMixSelection(JSON.stringify({ version: 2, mode: 'balanced' }))
		).toBeUndefined();
		expect(
			parseReferencePracticeMixSelection(
				JSON.stringify({ version: 1, mode: 'custom', subjects: 'nature' })
			)
		).toBeUndefined();
	});
});

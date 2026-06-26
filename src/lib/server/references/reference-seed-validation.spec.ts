import { describe, expect, it } from 'vitest';
import type { ReferenceSearchSeed } from './reference-seed';
import { validateReferenceSearchSeeds } from './reference-seed-validation';

const validSeed = {
	id: 'objects-cup',
	label: 'Cup',
	query: 'ordinary cup tabletop reference photo',
	primarySubject: 'objects',
	topic: 'household-objects',
	sceneTypes: ['still-life'],
	focuses: ['shape'],
	complexity: 'simple',
	coverageTags: ['everyday-object']
} satisfies ReferenceSearchSeed;

function validateSingleSeed(seed: ReferenceSearchSeed) {
	return validateReferenceSearchSeeds([seed], {
		minimumTotalSeedCount: 1,
		minimumSeedCountPerTopic: 0,
		requiredSceneTypes: [],
		requiredPracticeFocuses: [],
		requiredComplexities: [],
		requiredCoverageTags: []
	});
}

describe('validateReferenceSearchSeeds', () => {
	it('accepts a valid minimal seed when aggregate coverage rules are disabled', () => {
		expect(validateSingleSeed(validSeed)).toEqual([]);
	});

	it('reports duplicate seed ids and normalized queries', () => {
		const issues = validateReferenceSearchSeeds(
			[
				validSeed,
				{ ...validSeed, label: 'Cup duplicate', query: 'ordinary   cup tabletop reference photo' }
			],
			{
				minimumTotalSeedCount: 1,
				minimumSeedCountPerTopic: 0,
				requiredSceneTypes: [],
				requiredPracticeFocuses: [],
				requiredComplexities: [],
				requiredCoverageTags: []
			}
		);

		expect(issues.map((issue) => issue.message)).toContain('seed id must be unique');
		expect(issues.map((issue) => issue.message)).toContain(
			'seed query must be unique after normalization'
		);
	});

	it('reports invalid taxonomy relationships', () => {
		const issues = validateSingleSeed({
			...validSeed,
			primarySubject: 'objects',
			topic: 'rooms'
		});

		expect(issues.map((issue) => issue.message)).toContain('topic must belong to primary subject');
	});

	it('reports low-quality query terms', () => {
		const issues = validateSingleSeed({
			...validSeed,
			query: 'beautiful cup studio reference photo'
		});

		expect(issues.map((issue) => issue.message)).toContain(
			'query must not contain low-quality term "beautiful"'
		);
		expect(issues.map((issue) => issue.message)).toContain(
			'query must not contain low-quality term "studio"'
		);
	});
});

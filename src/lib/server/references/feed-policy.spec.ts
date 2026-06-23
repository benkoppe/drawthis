import { referenceCategories } from '$lib/references';
import { describe, expect, it } from 'vitest';
import { defaultReferenceFeedPolicy } from './feed-policy';

describe('defaultReferenceFeedPolicy', () => {
	it('defines at least one subject seed for every reference category', () => {
		const policyCategories = defaultReferenceFeedPolicy.categories.map(({ category }) => category);

		expect(new Set(policyCategories)).toEqual(new Set(referenceCategories));
		expect(
			defaultReferenceFeedPolicy.categories.every(({ subjectSeeds }) => subjectSeeds.length > 0)
		).toBe(true);
	});

	it('keeps subject seeds internally consistent', () => {
		const seedIds = new Set<string>();

		for (const categoryPolicy of defaultReferenceFeedPolicy.categories) {
			if (categoryPolicy.weight !== undefined) {
				expect(categoryPolicy.weight).toBeGreaterThan(0);
			}

			for (const seed of categoryPolicy.subjectSeeds) {
				expect(seed.category).toBe(categoryPolicy.category);
				expect(seed.query.trim()).not.toBe('');
				expect(seedIds.has(seed.id)).toBe(false);
				seedIds.add(seed.id);

				if (seed.weight !== undefined) {
					expect(seed.weight).toBeGreaterThan(0);
				}
			}
		}
	});
});

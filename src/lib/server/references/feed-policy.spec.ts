import { referenceSubjects } from '$lib/references';
import { describe, expect, it } from 'vitest';
import { defaultReferenceFeedPolicy } from './feed-policy';

describe('defaultReferenceFeedPolicy', () => {
	it('defines at least one search seed for every reference subject', () => {
		const policySubjects = defaultReferenceFeedPolicy.seeds.map(
			({ primarySubject }) => primarySubject
		);

		expect(new Set(policySubjects)).toEqual(new Set(referenceSubjects));
	});

	it('keeps search seeds internally consistent', () => {
		const seedIds = new Set<string>();

		for (const seed of defaultReferenceFeedPolicy.seeds) {
			expect(referenceSubjects).toContain(seed.primarySubject);
			expect(seed.query.trim()).not.toBe('');
			expect(seed.label.trim()).not.toBe('');
			expect(seedIds.has(seed.id)).toBe(false);
			seedIds.add(seed.id);

			if (seed.weight !== undefined) {
				expect(seed.weight).toBeGreaterThan(0);
			}
		}
	});

	it('keeps practice-mode seed weights pointed at existing seeds', () => {
		const seedIds = new Set(defaultReferenceFeedPolicy.seeds.map((seed) => seed.id));

		for (const modePolicy of defaultReferenceFeedPolicy.practiceModes ?? []) {
			for (const seedId of Object.keys(modePolicy.seedWeights ?? {})) {
				expect(seedIds.has(seedId)).toBe(true);
			}
		}
	});
});

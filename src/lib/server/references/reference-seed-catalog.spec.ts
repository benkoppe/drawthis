import {
	referencePracticeFocuses,
	referenceSceneTypes,
	referenceTopics,
	referenceVisualComplexities
} from '$lib/references';
import { describe, expect, it } from 'vitest';
import { referenceSeedCoverageTags } from './reference-seed';
import { validateReferenceSearchSeeds } from './reference-seed-validation';
import { defaultReferenceSearchSeeds } from './reference-seeds';

describe('defaultReferenceSearchSeeds', () => {
	it('passes the shared seed catalog validation rules', () => {
		expect(validateReferenceSearchSeeds(defaultReferenceSearchSeeds)).toEqual([]);
	});

	it('is a substantially deep curated catalog', () => {
		expect(defaultReferenceSearchSeeds.length).toBeGreaterThanOrEqual(110);
	});

	it('covers every taxonomy topic with multiple seeds', () => {
		for (const topic of referenceTopics) {
			const seedsForTopic = defaultReferenceSearchSeeds.filter((seed) => seed.topic === topic);

			expect(seedsForTopic.length, topic).toBeGreaterThanOrEqual(2);
		}
	});

	it('covers every training metadata dimension used by the feed sequencer', () => {
		const sceneTypes = new Set(
			defaultReferenceSearchSeeds.flatMap((seed) => seed.sceneTypes ?? [])
		);
		const focuses = new Set(defaultReferenceSearchSeeds.flatMap((seed) => seed.focuses ?? []));
		const complexities = new Set(
			defaultReferenceSearchSeeds.flatMap((seed) =>
				seed.complexity === undefined ? [] : [seed.complexity]
			)
		);

		expect(sceneTypes).toEqual(new Set(referenceSceneTypes));
		expect(focuses).toEqual(new Set(referencePracticeFocuses));
		expect(complexities).toEqual(new Set(referenceVisualComplexities));
	});

	it('covers every internal drawing curriculum tag', () => {
		const coverageTags = new Set(
			defaultReferenceSearchSeeds.flatMap((seed) => seed.coverageTags ?? [])
		);

		expect(coverageTags).toEqual(new Set(referenceSeedCoverageTags));
	});
});

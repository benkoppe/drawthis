import {
	isReferenceTopicForSubject,
	referencePracticeFocuses,
	referenceSceneTypes,
	referenceSubjects,
	referenceTopics,
	referenceVisualComplexities
} from '$lib/references';
import { describe, expect, it } from 'vitest';
import { referenceSeedCoverageTags } from './feed-policy';
import { defaultReferenceSearchSeeds } from './reference-seed-catalog';

const minimumSeedCountPerTopic = 2;
const forbiddenQueryTerms = ['stock', 'aesthetic', 'beautiful', 'studio'] as const;
const requiredCoverageTags = [
	'animal-detail',
	'animal-motion',
	'architecture',
	'body-parts',
	'clutter',
	'construction-practice',
	'desk',
	'everyday-object',
	'expression',
	'fabric',
	'feet',
	'food',
	'gesture',
	'groups',
	'hands',
	'interior',
	'kitchen',
	'landscape',
	'material-study',
	'mechanical-detail',
	'mundane',
	'negative-space',
	'organic-form',
	'perspective-practice',
	'plant',
	'portrait',
	'public-space',
	'still-life',
	'storefront',
	'street',
	'texture-study',
	'transit',
	'vehicle',
	'water'
] as const;

function normalizeQuery(query: string): string {
	return query.toLowerCase().trim().replaceAll(/\s+/g, ' ');
}

describe('defaultReferenceSearchSeeds', () => {
	it('is a substantially deep curated catalog', () => {
		expect(defaultReferenceSearchSeeds.length).toBeGreaterThanOrEqual(110);
	});

	it('defines valid, unique, useful seed metadata', () => {
		const seedIds = new Set<string>();
		const normalizedQueries = new Set<string>();

		for (const seed of defaultReferenceSearchSeeds) {
			expect(seed.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
			expect(seedIds.has(seed.id)).toBe(false);
			seedIds.add(seed.id);

			expect(seed.label.trim()).toBe(seed.label);
			expect(seed.label.length).toBeGreaterThan(2);

			expect(seed.query.trim()).toBe(seed.query);
			expect(seed.query.split(/\s+/).length).toBeGreaterThanOrEqual(4);
			expect(seed.query.length).toBeLessThanOrEqual(90);

			const normalizedQuery = normalizeQuery(seed.query);
			expect(normalizedQueries.has(normalizedQuery)).toBe(false);
			normalizedQueries.add(normalizedQuery);

			for (const term of forbiddenQueryTerms) {
				expect(normalizedQuery.split(/\s+/)).not.toContain(term);
			}

			expect(referenceSubjects).toContain(seed.primarySubject);
			expect(seed.topic).toBeDefined();
			expect(referenceTopics).toContain(seed.topic);
			expect(isReferenceTopicForSubject(seed.topic, seed.primarySubject)).toBe(true);

			if (seed.secondarySubjects !== undefined) {
				expect(new Set(seed.secondarySubjects).size).toBe(seed.secondarySubjects.length);

				for (const subject of seed.secondarySubjects) {
					expect(referenceSubjects).toContain(subject);
					expect(subject).not.toBe(seed.primarySubject);
				}
			}

			if (seed.sceneTypes !== undefined) {
				expect(seed.sceneTypes.length).toBeGreaterThan(0);
				expect(new Set(seed.sceneTypes).size).toBe(seed.sceneTypes.length);

				for (const sceneType of seed.sceneTypes) {
					expect(referenceSceneTypes).toContain(sceneType);
				}
			}

			if (seed.focuses !== undefined) {
				expect(seed.focuses.length).toBeGreaterThan(0);
				expect(new Set(seed.focuses).size).toBe(seed.focuses.length);

				for (const focus of seed.focuses) {
					expect(referencePracticeFocuses).toContain(focus);
				}
			}

			if (seed.complexity !== undefined) {
				expect(referenceVisualComplexities).toContain(seed.complexity);
			}

			if ('weight' in seed && seed.weight !== undefined) {
				expect(seed.weight).toBeGreaterThan(0);
			}

			if (seed.coverageTags !== undefined) {
				expect(seed.coverageTags.length).toBeGreaterThan(0);
				expect(new Set(seed.coverageTags).size).toBe(seed.coverageTags.length);

				for (const tag of seed.coverageTags) {
					expect(referenceSeedCoverageTags).toContain(tag);
				}
			}
		}
	});

	it('covers every taxonomy topic with multiple seeds', () => {
		for (const topic of referenceTopics) {
			const seedsForTopic = defaultReferenceSearchSeeds.filter((seed) => seed.topic === topic);

			expect(seedsForTopic.length, topic).toBeGreaterThanOrEqual(minimumSeedCountPerTopic);
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

	it('covers the internal drawing curriculum tags promised by the catalog', () => {
		const coverageTags = new Set(
			defaultReferenceSearchSeeds.flatMap((seed) => seed.coverageTags ?? [])
		);

		expect(coverageTags).toEqual(new Set(referenceSeedCoverageTags));

		for (const tag of requiredCoverageTags) {
			expect(coverageTags.has(tag), tag).toBe(true);
		}
	});
});

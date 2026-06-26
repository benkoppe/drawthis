import { referenceSubjects } from '$lib/references';
import { describe, expect, it } from 'vitest';
import { localReferenceProvider } from './local';

describe('localReferenceProvider', () => {
	it('normalizes local catalog items into drawing references', async () => {
		const result = await localReferenceProvider.search({ count: 1, primarySubject: 'places' });
		const [reference] = result.references;

		expect(reference).toMatchObject({
			id: 'local:room-interior',
			provider: {
				id: 'local',
				name: 'DrawThis local references',
				referenceId: 'room-interior'
			},
			title: 'Room Interior',
			taxonomy: {
				primarySubject: 'places',
				topic: 'rooms'
			},
			training: {
				sceneTypes: ['interior', 'everyday-life']
			},
			image: {
				url: '/references/room-interior.svg',
				alt: expect.stringContaining('room corner')
			},
			attribution: {
				label: 'DrawThis local mock reference',
				sourceName: 'DrawThis',
				sourceUrl: '/references/room-interior.svg'
			}
		});
	});

	it('filters references by subject', async () => {
		const result = await localReferenceProvider.search({ count: 5, primarySubject: 'people' });

		expect(result.references).toHaveLength(1);
		expect(result.references[0]?.id).toBe('local:hand-study');
	});

	it('filters references by topic', async () => {
		const matching = await localReferenceProvider.search({
			count: 5,
			primarySubject: 'places',
			topic: 'streets-sidewalks'
		});
		const mismatching = await localReferenceProvider.search({
			count: 5,
			primarySubject: 'places',
			topic: 'rooms'
		});

		expect(matching.references.map((reference) => reference.id)).toEqual(['local:street-corner']);
		expect(mismatching.references.map((reference) => reference.id)).toEqual([
			'local:room-interior'
		]);
	});

	it('has local fallback coverage for every main subject', () => {
		expect(new Set(localReferenceProvider.capabilities.subjects)).toEqual(
			new Set(referenceSubjects)
		);
	});
});

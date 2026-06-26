import type { DrawingReference, ReferenceSubjectId } from '$lib/references';
import { describe, expect, it } from 'vitest';
import { referenceSelectionRanks, sequenceReferenceCandidates } from './feed-sequencer';

function makeReference(id: string, primarySubject: ReferenceSubjectId): DrawingReference {
	return {
		id: `test:${id}`,
		provider: {
			id: 'test',
			name: 'Test provider',
			referenceId: id
		},
		title: id,
		taxonomy: { primarySubject },
		image: {
			url: `https://example.com/${id}.jpg`,
			alt: id
		},
		attribution: {
			label: 'Test provider',
			sourceName: 'Test provider',
			sourceUrl: `https://example.com/${id}`
		}
	};
}

function makeCandidate(id: string, primarySubject: ReferenceSubjectId, order: number) {
	return {
		reference: makeReference(id, primarySubject),
		rank: referenceSelectionRanks.preferred,
		order
	};
}

describe('sequenceReferenceCandidates', () => {
	it('avoids adjacent subject repeats when another equally viable subject is available', () => {
		const references = sequenceReferenceCandidates(
			[
				makeCandidate('objects-1', 'objects', 0),
				makeCandidate('objects-2', 'objects', 1),
				makeCandidate('places-1', 'places', 2),
				makeCandidate('nature-1', 'nature', 3)
			],
			{ count: 4 }
		);

		expect(references.map((reference) => reference.taxonomy.primarySubject)).toEqual([
			'objects',
			'places',
			'nature',
			'objects'
		]);
	});

	it('continues from the preceding queue context', () => {
		const references = sequenceReferenceCandidates(
			[makeCandidate('objects-1', 'objects', 0), makeCandidate('places-1', 'places', 1)],
			{
				count: 2,
				precedingReferences: [{ id: 'test:current', taxonomy: { primarySubject: 'objects' } }]
			}
		);

		expect(references.map((reference) => reference.taxonomy.primarySubject)).toEqual([
			'places',
			'objects'
		]);
	});

	it('allows adjacent repeats when no alternative subject remains', () => {
		const references = sequenceReferenceCandidates(
			[makeCandidate('objects-1', 'objects', 0), makeCandidate('objects-2', 'objects', 1)],
			{ count: 2 }
		);

		expect(references.map((reference) => reference.taxonomy.primarySubject)).toEqual([
			'objects',
			'objects'
		]);
	});

	it('uses topic, seed, scene, focus, and complexity context to avoid repetitive training metadata', () => {
		const repeated = makeCandidate('repeated', 'objects', 0);
		repeated.reference.taxonomy.topic = 'still-life-groups';
		repeated.reference.selection = {
			seed: { id: 'objects-mug-bottle', label: 'Mug and bottle' }
		};
		repeated.reference.training = {
			sceneTypes: ['still-life'],
			focuses: ['construction'],
			complexity: 'moderate'
		};

		const varied = makeCandidate('varied', 'objects', 1);
		varied.reference.taxonomy.topic = 'tools';
		varied.reference.selection = { seed: { id: 'objects-tools-table', label: 'Tools on table' } };
		varied.reference.training = {
			sceneTypes: ['workplace'],
			focuses: ['perspective'],
			complexity: 'complex'
		};

		const references = sequenceReferenceCandidates([repeated, varied], {
			count: 1,
			recentReferences: [
				{
					id: 'test:recent',
					taxonomy: { primarySubject: 'objects', topic: 'still-life-groups' },
					selection: { seedId: 'objects-mug-bottle' },
					training: {
						sceneTypes: ['still-life'],
						focuses: ['construction'],
						complexity: 'moderate'
					}
				}
			]
		});

		expect(references.map((reference) => reference.id)).toEqual(['test:varied']);
	});
});

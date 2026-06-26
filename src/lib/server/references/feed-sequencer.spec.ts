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
				precedingReferences: [{ id: 'test:current', primarySubject: 'objects' }]
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
});

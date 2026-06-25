import type { DrawingReference, ReferenceCategory } from '$lib/references';
import { describe, expect, it } from 'vitest';
import { referenceSelectionRanks, sequenceReferenceCandidates } from './feed-sequencer';

function makeReference(id: string, category: ReferenceCategory): DrawingReference {
	return {
		id: `test:${id}`,
		provider: {
			id: 'test',
			name: 'Test provider',
			referenceId: id
		},
		title: id,
		category,
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

function makeCandidate(id: string, category: ReferenceCategory, order: number) {
	return {
		reference: makeReference(id, category),
		rank: referenceSelectionRanks.preferred,
		order
	};
}

describe('sequenceReferenceCandidates', () => {
	it('avoids adjacent category repeats when another equally viable category is available', () => {
		const references = sequenceReferenceCandidates(
			[
				makeCandidate('still-life-1', 'still-life', 0),
				makeCandidate('still-life-2', 'still-life', 1),
				makeCandidate('street-1', 'street', 2),
				makeCandidate('plant-1', 'plant', 3)
			],
			{ count: 4 }
		);

		expect(references.map((reference) => reference.category)).toEqual([
			'still-life',
			'street',
			'plant',
			'still-life'
		]);
	});

	it('continues from the preceding queue context', () => {
		const references = sequenceReferenceCandidates(
			[makeCandidate('still-life-1', 'still-life', 0), makeCandidate('street-1', 'street', 1)],
			{
				count: 2,
				precedingReferences: [{ id: 'test:current', category: 'still-life' }]
			}
		);

		expect(references.map((reference) => reference.category)).toEqual(['street', 'still-life']);
	});

	it('allows adjacent repeats when no alternative category remains', () => {
		const references = sequenceReferenceCandidates(
			[
				makeCandidate('still-life-1', 'still-life', 0),
				makeCandidate('still-life-2', 'still-life', 1)
			],
			{ count: 2 }
		);

		expect(references.map((reference) => reference.category)).toEqual(['still-life', 'still-life']);
	});
});

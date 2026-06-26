import { describe, expect, it } from 'vitest';
import {
	compactReferenceFeedContextItem,
	parseReferenceFeedContextItemLike,
	parseReferenceTaxonomyLike,
	parseReferenceTrainingMetadataLike,
	toReferenceFeedContextItem
} from './context';
import type { DrawingReference } from './types';

describe('reference context helpers', () => {
	it('parses taxonomy-like values into canonical taxonomy metadata', () => {
		expect(
			parseReferenceTaxonomyLike({
				primarySubject: 'places',
				topic: 'rooms',
				secondarySubjects: ['objects', 'places', 'objects']
			})
		).toEqual({
			primarySubject: 'places',
			topic: 'rooms',
			secondarySubjects: ['objects']
		});
	});

	it('drops invalid or mismatched taxonomy-like values', () => {
		expect(parseReferenceTaxonomyLike({ primarySubject: 'unknown' })).toBeUndefined();
		expect(parseReferenceTaxonomyLike({ primarySubject: 'people', topic: 'rooms' })).toEqual({
			primarySubject: 'people'
		});
	});

	it('parses training-like values into canonical training metadata', () => {
		expect(
			parseReferenceTrainingMetadataLike({
				sceneTypes: ['interior', 'unknown', 'still-life'],
				focuses: ['shape', 'unknown', 'value'],
				complexity: 'moderate'
			})
		).toEqual({
			sceneTypes: ['still-life', 'interior'],
			focuses: ['shape', 'value'],
			complexity: 'moderate'
		});
	});

	it('converts drawing references into feed context items', () => {
		const reference: DrawingReference = {
			id: 'pexels:1',
			provider: { id: 'pexels', name: 'Pexels', referenceId: '1' },
			title: 'Reference',
			taxonomy: { primarySubject: 'places', topic: 'rooms' },
			training: { sceneTypes: ['interior'], focuses: ['perspective'] },
			selection: { seed: { id: 'places-room-corner', label: 'Room corner' } },
			image: { url: 'https://example.com/image.jpg', alt: 'Reference' },
			attribution: { label: 'Example', sourceName: 'Example', sourceUrl: 'https://example.com' }
		};

		expect(toReferenceFeedContextItem(reference)).toEqual({
			id: 'pexels:1',
			providerId: 'pexels',
			taxonomy: { primarySubject: 'places', topic: 'rooms' },
			training: { sceneTypes: ['interior'], focuses: ['perspective'] },
			selection: { seedId: 'places-room-corner' }
		});
	});

	it('parses and compacts feed context items', () => {
		const context = parseReferenceFeedContextItemLike({
			id: ' pexels:1 ',
			providerId: 'pexels',
			taxonomy: {
				primarySubject: 'places',
				topic: 'rooms',
				secondarySubjects: ['objects']
			},
			training: { sceneTypes: ['interior'], focuses: ['perspective'] },
			selection: { seedId: 'places-room-corner' }
		});

		expect(context).toEqual({
			id: 'pexels:1',
			providerId: 'pexels',
			taxonomy: {
				primarySubject: 'places',
				topic: 'rooms',
				secondarySubjects: ['objects']
			},
			training: { sceneTypes: ['interior'], focuses: ['perspective'] },
			selection: { seedId: 'places-room-corner' }
		});
		expect(context && compactReferenceFeedContextItem(context)).toEqual({
			id: 'pexels:1',
			providerId: 'pexels',
			taxonomy: { primarySubject: 'places', topic: 'rooms' },
			selection: { seedId: 'places-room-corner' }
		});
	});
});

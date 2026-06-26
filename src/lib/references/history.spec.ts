import { maxRecentReferenceContexts, maxRecentReferenceIds } from './feed';
import {
	mergeRecentReferenceContexts,
	mergeRecentReferenceIds,
	parseRecentReferenceContexts,
	parseRecentReferenceIds,
	serializeRecentReferenceContexts,
	serializeRecentReferenceIds
} from './history';
import { describe, expect, it } from 'vitest';

const placesContext = {
	id: 'pexels:1',
	taxonomy: { primarySubject: 'places' as const },
	providerId: 'pexels'
};

const natureContext = {
	id: 'openverse:2',
	taxonomy: { primarySubject: 'nature' as const, topic: 'plants-flowers' as const },
	providerId: 'openverse',
	selection: { seedId: 'nature-potted-plant' },
	training: {
		sceneTypes: ['interior' as const],
		focuses: ['shape' as const],
		complexity: 'moderate' as const
	}
};

describe('reference history helpers', () => {
	it('round-trips serialized recent reference IDs', () => {
		const serialized = serializeRecentReferenceIds(['pexels:1', 'openverse:2']);

		expect(parseRecentReferenceIds(serialized)).toEqual(['pexels:1', 'openverse:2']);
	});

	it('ignores invalid serialized history', () => {
		expect(parseRecentReferenceIds('not json')).toEqual([]);
		expect(parseRecentReferenceIds(encodeURIComponent(JSON.stringify({ id: 'pexels:1' })))).toEqual(
			[]
		);
	});

	it('filters invalid and empty reference IDs', () => {
		expect(
			parseRecentReferenceIds(
				encodeURIComponent(JSON.stringify(['pexels:1', '', '  ', 42, null, 'openverse:2']))
			)
		).toEqual(['pexels:1', 'openverse:2']);
	});

	it('dedupes IDs and preserves newest ordering', () => {
		expect(
			mergeRecentReferenceIds(['pexels:1', 'pexels:2'], ['pexels:1'], ['openverse:3'])
		).toEqual(['pexels:2', 'pexels:1', 'openverse:3']);
	});

	it('trims history to the maximum recent reference count', () => {
		const referenceIds = Array.from({ length: maxRecentReferenceIds + 5 }, (_, index) =>
			String(index)
		);

		expect(mergeRecentReferenceIds(referenceIds)).toEqual(referenceIds.slice(5));
	});

	it('round-trips serialized recent reference contexts', () => {
		const contexts = [placesContext, natureContext];

		expect(parseRecentReferenceContexts(serializeRecentReferenceContexts(contexts))).toEqual(
			contexts
		);
	});

	it('filters invalid recent reference contexts', () => {
		expect(
			parseRecentReferenceContexts(
				encodeURIComponent(
					JSON.stringify([
						{ id: 'pexels:1', taxonomy: { primarySubject: 'places' } },
						{ id: '', taxonomy: { primarySubject: 'places' } },
						{ id: 'pexels:2', taxonomy: { primarySubject: 'unsupported' } },
						{ id: 'pexels:3', primarySubject: 'places' },
						42
					])
				)
			)
		).toEqual([{ id: 'pexels:1', taxonomy: { primarySubject: 'places' } }]);
	});

	it('dedupes reference contexts and trims them to the context history limit', () => {
		const contexts = Array.from({ length: maxRecentReferenceContexts + 5 }, (_, index) => ({
			id: String(index),
			taxonomy: { primarySubject: 'places' as const }
		}));

		expect(
			mergeRecentReferenceContexts(contexts, [{ id: '10', taxonomy: { primarySubject: 'nature' } }])
		).toEqual([
			...contexts.slice(5).filter(({ id }) => id !== '10'),
			{ id: '10', taxonomy: { primarySubject: 'nature' } }
		]);
	});
});

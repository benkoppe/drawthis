import { maxRecentReferenceIds } from './feed';
import {
	mergeRecentReferenceIds,
	parseRecentReferenceIds,
	serializeRecentReferenceIds
} from './history';
import { describe, expect, it } from 'vitest';

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
});

import { describe, expect, it } from 'vitest';
import { normalizeWeight, orderByScore, weightedShuffle } from './weighted-selection';

describe('weighted selection helpers', () => {
	it('normalizes missing and non-positive weights', () => {
		expect(normalizeWeight(undefined)).toBe(1);
		expect(normalizeWeight(3)).toBe(3);
		expect(normalizeWeight(0)).toBe(0);
		expect(normalizeWeight(-1)).toBe(0);
	});

	it('does a deterministic weighted shuffle with injected randomness', () => {
		expect(
			weightedShuffle(
				[
					{ item: 'light', weight: 1 },
					{ item: 'heavy', weight: 9 },
					{ item: 'disabled', weight: 0 }
				],
				() => 0.99
			)
		).toEqual(['heavy', 'light']);
	});

	it('orders by score before shuffled tie order', () => {
		expect(
			orderByScore(
				['late', 'early'],
				(item) => (item === 'early' ? 0 : 1),
				() => 1,
				() => 0.99
			)
		).toEqual(['early', 'late']);
	});
});

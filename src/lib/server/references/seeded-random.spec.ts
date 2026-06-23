import { describe, expect, it } from 'vitest';
import { createSeededRandom } from './seeded-random';

describe('createSeededRandom', () => {
	it('returns the same sequence for the same seed', () => {
		const first = createSeededRandom('same-seed');
		const second = createSeededRandom('same-seed');

		expect(Array.from({ length: 5 }, () => first())).toEqual(
			Array.from({ length: 5 }, () => second())
		);
	});

	it('returns different sequences for different seeds', () => {
		const first = createSeededRandom('first-seed');
		const second = createSeededRandom('second-seed');

		expect(Array.from({ length: 5 }, () => first())).not.toEqual(
			Array.from({ length: 5 }, () => second())
		);
	});

	it('returns values greater than or equal to 0 and less than 1', () => {
		const random = createSeededRandom('bounded-seed');
		const values = Array.from({ length: 100 }, () => random());

		expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
	});
});

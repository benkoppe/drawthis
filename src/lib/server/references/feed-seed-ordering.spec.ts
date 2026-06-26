import { describe, expect, it } from 'vitest';
import { orderSeedsByBalancedTaxonomy } from './feed-seed-ordering';
import type { ReferenceSearchSeed } from './reference-seed';

function makeSeed(
	id: string,
	primarySubject: ReferenceSearchSeed['primarySubject'],
	topic: ReferenceSearchSeed['topic'],
	overrides: Partial<ReferenceSearchSeed> = {}
): ReferenceSearchSeed {
	return {
		id,
		label: id,
		query: `${id} reference photo`,
		primarySubject,
		topic,
		...overrides
	};
}

describe('orderSeedsByBalancedTaxonomy', () => {
	it('round-robins subjects before repeating a subject', () => {
		const seeds = orderSeedsByBalancedTaxonomy(
			[
				makeSeed('objects-1', 'objects', 'household-objects'),
				makeSeed('objects-2', 'objects', 'tools'),
				makeSeed('places-1', 'places', 'rooms'),
				makeSeed('places-2', 'places', 'streets-sidewalks')
			],
			[],
			() => 0
		);

		expect(seeds.map((seed) => seed.id)).toEqual([
			'objects-1',
			'places-1',
			'objects-2',
			'places-2'
		]);
	});

	it('round-robins topics before repeating a topic within a subject', () => {
		const seeds = orderSeedsByBalancedTaxonomy(
			[
				makeSeed('household-1', 'objects', 'household-objects'),
				makeSeed('household-2', 'objects', 'household-objects'),
				makeSeed('tools-1', 'objects', 'tools'),
				makeSeed('tools-2', 'objects', 'tools')
			],
			[],
			() => 0
		);

		expect(seeds.map((seed) => seed.id)).toEqual([
			'household-1',
			'tools-1',
			'household-2',
			'tools-2'
		]);
	});

	it('uses recent context to avoid repeating the previous subject and seed metadata', () => {
		const seeds = orderSeedsByBalancedTaxonomy(
			[
				makeSeed('objects-recent', 'objects', 'household-objects'),
				makeSeed('places-next', 'places', 'rooms')
			],
			[
				{
					id: 'test:recent',
					taxonomy: { primarySubject: 'objects', topic: 'household-objects' },
					selection: { seedId: 'objects-recent' }
				}
			],
			() => 0
		);

		expect(seeds.map((seed) => seed.id)).toEqual(['places-next', 'objects-recent']);
	});
});

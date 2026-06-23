import type { DrawingReference } from '$lib/references';
import type { ProviderSearchRequest, ProviderSearchResult, ReferenceProvider } from './provider';
import { describe, expect, it } from 'vitest';
import { getReferenceFeed } from './feed';
import { localReferenceProvider } from './providers/local';

function makeReference(id: string): DrawingReference {
	return {
		id: `test:${id}`,
		provider: {
			id: 'test',
			name: 'Test provider',
			referenceId: id
		},
		title: id,
		category: 'still-life',
		image: {
			url: `https://example.com/${id}.jpg`,
			alt: id
		},
		attribution: {
			label: 'Test provider',
			sourceUrl: `https://example.com/${id}`
		}
	};
}

function makeProvider(
	search: (request: ProviderSearchRequest) => ProviderSearchResult
): ReferenceProvider {
	return {
		id: 'test',
		name: 'Test provider',
		capabilities: {
			categories: ['still-life'],
			supportsSearch: false,
			supportsPagination: false,
			supportsOrientation: false,
			attributionRequired: true
		},
		async search(request) {
			return search(request);
		}
	};
}

describe('getReferenceFeed', () => {
	it('avoids recently seen references when possible', async () => {
		const firstFeed = await getReferenceFeed({ count: 1 }, { providers: [localReferenceProvider] });
		const secondFeed = await getReferenceFeed(
			{ count: 1, recentReferenceIds: firstFeed.references.map((reference) => reference.id) },
			{ providers: [localReferenceProvider] }
		);

		expect(firstFeed.references[0]?.id).toBe('local:room-interior');
		expect(secondFeed.references[0]?.id).toBe('local:street-corner');
	});

	it('allows repeats after all compatible references have been seen', async () => {
		const feed = await getReferenceFeed(
			{
				count: 1,
				recentReferenceIds: [
					'local:room-interior',
					'local:street-corner',
					'local:hand-study',
					'local:still-life',
					'local:plant-window'
				]
			},
			{ providers: [localReferenceProvider] }
		);

		expect(feed.references[0]?.id).toBe('local:room-interior');
	});

	it('falls back to the next compatible provider with available references', async () => {
		const emptyProvider = makeProvider(() => ({ references: [] }));
		const availableProvider = makeProvider(() => ({ references: [makeReference('available')] }));
		const feed = await getReferenceFeed(
			{ count: 1, category: 'still-life' },
			{ providers: [emptyProvider, availableProvider] }
		);

		expect(feed.references[0]?.id).toBe('test:available');
	});

	it('rejects invalid counts', async () => {
		await expect(getReferenceFeed({ count: 0 })).rejects.toThrow(
			'count must be an integer between 1 and 10'
		);
	});
});

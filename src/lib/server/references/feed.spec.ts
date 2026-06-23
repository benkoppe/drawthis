import type { DrawingReference, ReferenceCategory } from '$lib/references';
import type { ProviderSearchRequest, ProviderSearchResult, ReferenceProvider } from './provider';
import { describe, expect, it, vi } from 'vitest';
import { getReferenceFeed } from './feed';
import { localReferenceProvider } from './providers/local';

function makeReference(id: string, category: ReferenceCategory = 'still-life'): DrawingReference {
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
			sourceUrl: `https://example.com/${id}`
		}
	};
}

function makeProvider(
	search: (request: ProviderSearchRequest) => ProviderSearchResult,
	options: {
		id?: string;
		categories?: readonly ReferenceCategory[];
		supportsSearch?: boolean;
	} = {}
): ReferenceProvider {
	return {
		id: options.id ?? 'test',
		name: 'Test provider',
		capabilities: {
			categories: options.categories ?? ['still-life'],
			supportsSearch: options.supportsSearch ?? false,
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
	it('avoids recently seen references by trying another planned category when possible', async () => {
		const firstFeed = await getReferenceFeed(
			{ count: 1 },
			{ providers: [localReferenceProvider], random: () => 0 }
		);
		const secondFeed = await getReferenceFeed(
			{ count: 1, recentReferenceIds: firstFeed.references.map((reference) => reference.id) },
			{ providers: [localReferenceProvider], random: () => 0 }
		);

		expect(firstFeed.references[0]?.id).toBe('local:room-interior');
		expect(secondFeed.references[0]?.id).toBe('local:street-corner');
	});

	it('relaxes recent history after all compatible references have been seen', async () => {
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
			{ providers: [localReferenceProvider], random: () => 0 }
		);

		expect(feed.references[0]?.id).toBe('local:room-interior');
	});

	it('avoids the current reference even when recent history is exhausted', async () => {
		const feed = await getReferenceFeed(
			{
				count: 1,
				currentReferenceId: 'local:room-interior',
				recentReferenceIds: [
					'local:room-interior',
					'local:street-corner',
					'local:hand-study',
					'local:still-life',
					'local:plant-window'
				]
			},
			{ providers: [localReferenceProvider], random: () => 0 }
		);

		expect(feed.references[0]?.id).toBe('local:street-corner');
	});

	it('allows the current reference only when it is the only compatible option', async () => {
		const feed = await getReferenceFeed(
			{
				count: 1,
				currentReferenceId: 'local:room-interior',
				preferences: { enabledCategories: ['interior'] }
			},
			{ providers: [localReferenceProvider], random: () => 0 }
		);

		expect(feed.references[0]?.id).toBe('local:room-interior');
	});

	it('relaxes soft recent references before hard current references', async () => {
		const currentReference = makeReference('current');
		const recentReference = makeReference('recent');
		const provider = makeProvider(() => ({ references: [currentReference, recentReference] }));
		const feed = await getReferenceFeed(
			{
				count: 1,
				currentReferenceId: currentReference.id,
				recentReferenceIds: [recentReference.id],
				preferences: { enabledCategories: ['still-life'] }
			},
			{ providers: [provider], random: () => 0 }
		);

		expect(feed.references.map((reference) => reference.id)).toEqual([recentReference.id]);
	});

	it('returns preferred references before soft and hard fallback references', async () => {
		const currentReference = makeReference('current');
		const recentReference = makeReference('recent');
		const preferredReference = makeReference('preferred');
		const provider = makeProvider(() => ({
			references: [currentReference, recentReference, preferredReference]
		}));
		const feed = await getReferenceFeed(
			{
				count: 3,
				currentReferenceId: currentReference.id,
				recentReferenceIds: [recentReference.id],
				preferences: { enabledCategories: ['still-life'] }
			},
			{ providers: [provider], random: () => 0 }
		);

		expect(feed.references.map((reference) => reference.id)).toEqual([
			preferredReference.id,
			recentReference.id,
			currentReference.id
		]);
	});

	it('falls back to the next compatible provider with available references', async () => {
		const emptyProvider = makeProvider(() => ({ references: [] }), { id: 'empty' });
		const availableProvider = makeProvider(() => ({ references: [makeReference('available')] }), {
			id: 'available'
		});
		const feed = await getReferenceFeed(
			{ count: 1, preferences: { enabledCategories: ['still-life'] } },
			{ providers: [emptyProvider, availableProvider], random: () => 0 }
		);

		expect(feed.references[0]?.id).toBe('test:available');
	});

	it('continues to local fallback when an external provider fails', async () => {
		const providerError = new Error('upstream unavailable');
		const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const failingProvider = makeProvider(
			() => {
				throw providerError;
			},
			{ id: 'failing' }
		);

		try {
			const feed = await getReferenceFeed(
				{ count: 1, preferences: { enabledCategories: ['still-life'] } },
				{ providers: [failingProvider, localReferenceProvider], random: () => 0 }
			);

			expect(feed.references[0]?.id).toBe('local:still-life');
			expect(warning).toHaveBeenCalledWith('Reference provider "failing" failed', providerError);
		} finally {
			warning.mockRestore();
		}
	});

	it('restricts references to enabled category preferences', async () => {
		const feed = await getReferenceFeed(
			{ count: 1, preferences: { enabledCategories: ['plant'] } },
			{ providers: [localReferenceProvider], random: () => 0 }
		);

		expect(feed.references[0]?.id).toBe('local:plant-window');
		expect(feed.references[0]?.category).toBe('plant');
	});

	it('passes planned queries to search-capable providers', async () => {
		const requests: ProviderSearchRequest[] = [];
		const provider = makeProvider(
			(request) => {
				requests.push(request);
				return { references: [makeReference('available')] };
			},
			{ supportsSearch: true }
		);

		await getReferenceFeed(
			{ count: 1, preferences: { enabledCategories: ['still-life'] } },
			{ providers: [provider], random: () => 0 }
		);

		expect(requests[0]).toMatchObject({
			count: 1,
			category: 'still-life',
			query: 'mug and bottle still life'
		});
	});

	it('requests enough provider results to account for current and recent references', async () => {
		const requests: ProviderSearchRequest[] = [];
		const provider = makeProvider((request) => {
			requests.push(request);
			return { references: [makeReference('available')] };
		});

		await getReferenceFeed(
			{
				count: 1,
				currentReferenceId: 'test:current',
				recentReferenceIds: ['test:current', 'test:recent-1', 'test:recent-2'],
				preferences: { enabledCategories: ['still-life'] }
			},
			{ providers: [provider], random: () => 0 }
		);

		expect(requests[0]?.count).toBe(4);
	});

	it('rejects invalid counts', async () => {
		await expect(getReferenceFeed({ count: 0 })).rejects.toThrow(
			'count must be an integer between 1 and 10'
		);
	});
});

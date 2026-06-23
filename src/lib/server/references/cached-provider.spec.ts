import type { DrawingReference, ReferenceCategory } from '$lib/references';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryReferenceSearchCache } from './cache';
import { searchReferenceProvider } from './cached-provider';
import { ReferenceProviderHttpError } from './provider-error';
import type { ProviderSearchRequest, ProviderSearchResult, ReferenceProvider } from './provider';

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
	id: string,
	search: (request: ProviderSearchRequest) => ProviderSearchResult | Promise<ProviderSearchResult>
): ReferenceProvider {
	return {
		id,
		name: id,
		capabilities: {
			categories: ['still-life'],
			supportsSearch: true,
			supportsPagination: true,
			supportsOrientation: true,
			attributionRequired: true
		},
		async search(request) {
			return search(request);
		}
	};
}

const request = {
	count: 10,
	category: 'still-life',
	query: 'mug and bottle still life',
	cursor: '1'
} satisfies ProviderSearchRequest;

describe('searchReferenceProvider', () => {
	it('reuses cached provider search metadata for identical requests', async () => {
		const search = vi.fn(() => ({
			references: [makeReference('cached')],
			cachePolicy: { metadataTtlSeconds: 60, canCacheImageBytes: false }
		}));
		const provider = makeProvider('cached-test-provider', search);
		const cache = createMemoryReferenceSearchCache();

		const first = await searchReferenceProvider(provider, request, cache);
		const second = await searchReferenceProvider(provider, request, cache);

		expect(search).toHaveBeenCalledTimes(1);
		expect(first.references[0]?.id).toBe('test:cached');
		expect(second.references[0]?.id).toBe('test:cached');
	});

	it('serves stale cached metadata when a refreshed provider search fails', async () => {
		const cache = createMemoryReferenceSearchCache();
		const provider = makeProvider('stale-test-provider', () => ({
			references: [makeReference('stale')],
			cachePolicy: { metadataTtlSeconds: 1, canCacheImageBytes: false }
		}));

		await searchReferenceProvider(provider, request, cache);
		await new Promise((resolve) => setTimeout(resolve, 1_050));

		const failingProvider = makeProvider('stale-test-provider', () => {
			throw new ReferenceProviderHttpError('rate limited', { status: 429, retryAfterSeconds: 30 });
		});
		const result = await searchReferenceProvider(failingProvider, request, cache);

		expect(result.references[0]?.id).toBe('test:stale');
	});

	it('coalesces concurrent equivalent provider searches', async () => {
		let resolveSearch: (result: ProviderSearchResult) => void = () => {};
		const search = vi.fn(
			() =>
				new Promise<ProviderSearchResult>((resolve) => {
					resolveSearch = resolve;
				})
		);
		const provider = makeProvider('single-flight-test-provider', search);
		const cache = createMemoryReferenceSearchCache();
		const first = searchReferenceProvider(provider, request, cache);
		const second = searchReferenceProvider(provider, request, cache);

		await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(1));
		resolveSearch({
			references: [makeReference('single-flight')],
			cachePolicy: { metadataTtlSeconds: 60, canCacheImageBytes: false }
		});

		await expect(first).resolves.toMatchObject({
			references: [{ id: 'test:single-flight' }]
		});
		await expect(second).resolves.toMatchObject({
			references: [{ id: 'test:single-flight' }]
		});
		expect(search).toHaveBeenCalledTimes(1);
	});
});

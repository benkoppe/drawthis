import { describe, expect, it } from 'vitest';
import { createOpenverseReferenceProvider } from './openverse';

function makeOpenverseResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		result_count: 1,
		page_count: 2,
		page_size: 1,
		page: 1,
		results: [
			{
				id: 'openverse-image-1',
				title: 'Cluttered desk by a window',
				foreign_landing_url: 'https://example.com/source/image',
				url: 'https://images.example.com/desk.jpg',
				creator: 'Example Creator',
				creator_url: 'https://example.com/creator',
				license: 'by-sa',
				license_version: '4.0',
				license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
				provider: 'example-source',
				source: 'example-source',
				attribution:
					'"Cluttered desk by a window" by Example Creator is licensed under CC BY-SA 4.0.',
				mature: false,
				width: 1200,
				height: 800
			}
		],
		...overrides
	};
}

function makeJsonResponse(body: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' },
		...init
	});
}

describe('createOpenverseReferenceProvider', () => {
	it('searches with the generated planner query and normalizes image results', async () => {
		const requests: { input: RequestInfo | URL; init: RequestInit | undefined }[] = [];
		const fetchMock: typeof fetch = async (input, init) => {
			requests.push({ input, init });
			return makeJsonResponse(makeOpenverseResponse());
		};
		const provider = createOpenverseReferenceProvider({
			apiBaseUrl: 'https://api.openverse.org/v1',
			fetch: fetchMock
		});

		const result = await provider.search({
			count: 1,
			primarySubject: 'places',
			query: 'cluttered desk',
			orientation: 'landscape'
		});

		expect(requests).toHaveLength(1);
		expect(requests[0]?.input.toString()).toBe(
			'https://api.openverse.org/v1/images/?format=json&page_size=1&page=1&mature=false&category=photograph&q=cluttered+desk&aspect_ratio=wide'
		);
		expect(requests[0]?.init?.headers).toEqual({ Accept: 'application/json' });
		expect(result).toMatchObject({
			nextCursor: '2',
			cachePolicy: {
				metadataTtlSeconds: 3600,
				canCacheImageBytes: false
			},
			references: [
				{
					id: 'openverse:openverse-image-1',
					provider: {
						id: 'openverse',
						name: 'Openverse',
						referenceId: 'openverse-image-1'
					},
					title: 'Cluttered desk by a window',
					taxonomy: { primarySubject: 'places' },
					image: {
						url: 'https://images.example.com/desk.jpg',
						alt: 'Cluttered desk by a window by Example Creator',
						width: 1200,
						height: 800
					},
					attribution: {
						label:
							'"Cluttered desk by a window" by Example Creator is licensed under CC BY-SA 4.0.',
						sourceName: 'Openverse',
						sourceUrl: 'https://example.com/source/image',
						creatorName: 'Example Creator',
						creatorUrl: 'https://example.com/creator',
						licenseName: 'CC BY-SA 4.0',
						licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
					}
				}
			]
		});
	});

	it('passes portrait and cursor requests through Openverse parameters', async () => {
		const requests: string[] = [];
		const fetchMock: typeof fetch = async (input) => {
			requests.push(input.toString());
			return makeJsonResponse(makeOpenverseResponse({ page: 3, page_count: 3 }));
		};
		const provider = createOpenverseReferenceProvider({
			apiBaseUrl: 'https://api.openverse.org/v1/',
			fetch: fetchMock
		});

		const result = await provider.search({
			count: 5,
			primarySubject: 'people',
			query: 'standing figure pose',
			orientation: 'portrait',
			cursor: '3'
		});

		expect(requests[0]).toBe(
			'https://api.openverse.org/v1/images/?format=json&page_size=5&page=3&mature=false&category=photograph&q=standing+figure+pose&aspect_ratio=tall'
		);
		expect(result.nextCursor).toBeUndefined();
	});

	it('skips mature or incomplete Openverse results', async () => {
		const provider = createOpenverseReferenceProvider({
			apiBaseUrl: 'https://api.openverse.org/v1',
			fetch: async () =>
				makeJsonResponse(
					makeOpenverseResponse({
						results: [
							{ id: 'mature', url: 'https://example.com/mature.jpg', mature: true },
							{ id: 'missing-url', foreign_landing_url: 'https://example.com/source' }
						]
					})
				)
		});

		const result = await provider.search({
			count: 2,
			primarySubject: 'objects',
			query: 'tools on table'
		});

		expect(result.references).toEqual([]);
	});

	it('requires the feed planner to provide the reference subject', async () => {
		const provider = createOpenverseReferenceProvider({
			apiBaseUrl: 'https://api.openverse.org/v1',
			fetch: async () => makeJsonResponse(makeOpenverseResponse())
		});

		await expect(provider.search({ count: 1, query: 'potted plant' })).rejects.toThrow(
			'Openverse search requires a planned reference subject'
		);
	});

	it('throws when Openverse returns an unsuccessful response', async () => {
		const provider = createOpenverseReferenceProvider({
			apiBaseUrl: 'https://api.openverse.org/v1',
			fetch: async () => makeJsonResponse({ detail: 'rate limited' }, { status: 429 })
		});

		await expect(
			provider.search({ count: 1, primarySubject: 'nature', query: 'potted plant' })
		).rejects.toThrow('Openverse search failed with status 429');
	});
});

import { describe, expect, it } from 'vitest';
import { createPexelsReferenceProvider } from './pexels';

function makePexelsResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		page: 1,
		per_page: 1,
		total_results: 2,
		next_page: 'https://api.pexels.com/v1/search?query=cluttered+desk&per_page=1&page=2',
		photos: [
			{
				id: 2_014_422,
				width: 3024,
				height: 3024,
				url: 'https://www.pexels.com/photo/brown-rocks-during-golden-hour-2014422/',
				photographer: 'Joey Farina',
				photographer_url: 'https://www.pexels.com/@joey',
				photographer_id: 680_589,
				avg_color: '#978E82',
				src: {
					original: 'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg',
					large2x:
						'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
					large:
						'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
					medium:
						'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&h=350',
					small:
						'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&h=130',
					portrait:
						'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800',
					landscape:
						'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
					tiny: 'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=200&w=280'
				},
				liked: false,
				alt: 'Brown rocks during golden hour'
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

describe('createPexelsReferenceProvider', () => {
	it('searches with the generated planner query and normalizes photo results', async () => {
		const requests: { input: RequestInfo | URL; init: RequestInit | undefined }[] = [];
		const fetchMock: typeof fetch = async (input, init) => {
			requests.push({ input, init });
			return makeJsonResponse(makePexelsResponse());
		};
		const provider = createPexelsReferenceProvider({
			apiBaseUrl: 'https://api.pexels.com/v1',
			apiKey: 'pexels-api-key',
			fetch: fetchMock
		});

		const result = await provider.search({
			count: 1,
			primarySubject: 'places',
			topic: 'kitchens-workspaces',
			query: 'cluttered desk',
			sceneTypes: ['interior', 'workplace'],
			focuses: ['perspective', 'composition'],
			complexity: 'dense',
			seed: { id: 'places-cluttered-desk', label: 'Cluttered desk', query: 'cluttered desk' },
			orientation: 'landscape'
		});

		expect(requests).toHaveLength(1);
		expect(requests[0]?.input.toString()).toBe(
			'https://api.pexels.com/v1/search?query=cluttered+desk&per_page=1&page=1&orientation=landscape'
		);
		expect(requests[0]?.init?.headers).toEqual({
			Accept: 'application/json',
			Authorization: 'pexels-api-key'
		});
		expect(result).toMatchObject({
			nextCursor: '2',
			cachePolicy: {
				metadataTtlSeconds: 3600,
				canCacheImageBytes: false
			},
			references: [
				{
					id: 'pexels:2014422',
					provider: {
						id: 'pexels',
						name: 'Pexels',
						referenceId: '2014422'
					},
					title: 'Brown rocks during golden hour',
					taxonomy: { primarySubject: 'places', topic: 'kitchens-workspaces' },
					training: {
						sceneTypes: ['interior', 'workplace'],
						focuses: ['perspective', 'composition'],
						complexity: 'dense'
					},
					selection: {
						seed: {
							id: 'places-cluttered-desk',
							label: 'Cluttered desk',
							query: 'cluttered desk'
						}
					},
					image: {
						url: 'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
						alt: 'Brown rocks during golden hour',
						width: 3024,
						height: 3024
					},
					attribution: {
						label: 'Photo by Joey Farina on Pexels',
						sourceName: 'Pexels',
						sourceUrl: 'https://www.pexels.com/photo/brown-rocks-during-golden-hour-2014422/',
						creatorName: 'Joey Farina',
						creatorUrl: 'https://www.pexels.com/@joey',
						licenseName: 'Pexels License',
						licenseUrl: 'https://www.pexels.com/license'
					}
				}
			]
		});
	});

	it('passes portrait and cursor requests through Pexels parameters', async () => {
		const requests: string[] = [];
		const fetchMock: typeof fetch = async (input) => {
			requests.push(input.toString());
			return makeJsonResponse(
				makePexelsResponse({
					page: 3,
					per_page: 5,
					total_results: 15,
					next_page: undefined
				})
			);
		};
		const provider = createPexelsReferenceProvider({
			apiBaseUrl: 'https://api.pexels.com/v1/',
			apiKey: 'pexels-api-key',
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
			'https://api.pexels.com/v1/search?query=standing+figure+pose&per_page=5&page=3&orientation=portrait'
		);
		expect(result.nextCursor).toBeUndefined();
	});

	it('passes square orientation through Pexels parameters', async () => {
		const requests: string[] = [];
		const fetchMock: typeof fetch = async (input) => {
			requests.push(input.toString());
			return makeJsonResponse(makePexelsResponse());
		};
		const provider = createPexelsReferenceProvider({
			apiBaseUrl: 'https://api.pexels.com/v1',
			apiKey: 'pexels-api-key',
			fetch: fetchMock
		});

		await provider.search({
			count: 2,
			primarySubject: 'objects',
			query: 'mug still life',
			orientation: 'square'
		});

		expect(requests[0]).toBe(
			'https://api.pexels.com/v1/search?query=mug+still+life&per_page=2&page=1&orientation=square'
		);
	});

	it('omits orientation for orientation-agnostic requests and falls back to computed pagination', async () => {
		const requests: string[] = [];
		const fetchMock: typeof fetch = async (input) => {
			requests.push(input.toString());
			return makeJsonResponse(
				makePexelsResponse({
					page: 2,
					per_page: 10,
					total_results: 25,
					next_page: undefined
				})
			);
		};
		const provider = createPexelsReferenceProvider({
			apiBaseUrl: 'https://api.pexels.com/v1',
			apiKey: 'pexels-api-key',
			fetch: fetchMock
		});

		const result = await provider.search({
			count: 10,
			primarySubject: 'nature',
			query: 'potted plant',
			orientation: 'any'
		});

		expect(requests[0]).toBe(
			'https://api.pexels.com/v1/search?query=potted+plant&per_page=10&page=1'
		);
		expect(result.nextCursor).toBe('3');
	});

	it('skips incomplete or unusably small Pexels photo results', async () => {
		const provider = createPexelsReferenceProvider({
			apiBaseUrl: 'https://api.pexels.com/v1',
			apiKey: 'pexels-api-key',
			fetch: async () =>
				makeJsonResponse(
					makePexelsResponse({
						photos: [
							{ id: 1, url: 'https://www.pexels.com/photo/1/' },
							{ id: 2, src: { large: 'https://images.pexels.com/photos/2/photo.jpeg' } },
							{
								id: 3,
								url: 'https://www.pexels.com/photo/3/',
								width: 120,
								height: 120,
								src: { large: 'https://images.pexels.com/photos/3/photo.jpeg' }
							}
						]
					})
				)
		});

		const result = await provider.search({
			count: 3,
			primarySubject: 'objects',
			query: 'tools on table'
		});

		expect(result.references).toEqual([]);
	});

	it('requires the feed planner to provide the reference subject and generated query', async () => {
		const provider = createPexelsReferenceProvider({
			apiBaseUrl: 'https://api.pexels.com/v1',
			apiKey: 'pexels-api-key',
			fetch: async () => makeJsonResponse(makePexelsResponse())
		});

		await expect(provider.search({ count: 1, query: 'potted plant' })).rejects.toThrow(
			'Pexels search requires a planned reference subject'
		);
		await expect(provider.search({ count: 1, primarySubject: 'nature' })).rejects.toThrow(
			'Pexels search requires a generated query'
		);
	});

	it('throws when Pexels returns an unsuccessful response', async () => {
		const provider = createPexelsReferenceProvider({
			apiBaseUrl: 'https://api.pexels.com/v1',
			apiKey: 'pexels-api-key',
			fetch: async () => makeJsonResponse({ error: 'rate limited' }, { status: 429 })
		});

		await expect(
			provider.search({ count: 1, primarySubject: 'nature', query: 'potted plant' })
		).rejects.toThrow('Pexels search failed with status 429');
	});
});

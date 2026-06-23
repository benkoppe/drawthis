import { describe, expect, it } from 'vitest';
import { requestReferenceFeed } from './api';

describe('requestReferenceFeed', () => {
	it('posts reference feed requests to the app API', async () => {
		const fetchCalls: unknown[] = [];
		const fetcher: typeof fetch = async (...args) => {
			fetchCalls.push(args);

			return Response.json({ references: [] });
		};

		const response = await requestReferenceFeed(
			{ count: 1, recentReferenceIds: ['local:room-interior'] },
			{ fetch: fetcher, basePath: '/base' }
		);

		expect(response).toEqual({ references: [] });
		expect(fetchCalls).toEqual([
			[
				'/base/api/references',
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ count: 1, recentReferenceIds: ['local:room-interior'] })
				}
			]
		]);
	});

	it('throws when the app API rejects the request', async () => {
		const fetcher: typeof fetch = async () => new Response(null, { status: 500 });

		await expect(requestReferenceFeed({ count: 1 }, { fetch: fetcher })).rejects.toThrow(
			'Could not load the next reference.'
		);
	});
});

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
			{
				count: 1,
				currentReferenceId: 'local:room-interior',
				recentReferenceIds: ['local:street-corner'],
				preferences: { practiceMode: 'places-perspective', enabledSubjects: ['places'] }
			},
			{ fetch: fetcher, basePath: '/base' }
		);

		expect(response).toEqual({ references: [] });
		expect(fetchCalls).toEqual([
			[
				'/base/api/references',
				{
					method: 'POST',
					headers: { accept: 'application/json', 'content-type': 'application/json' },
					body: JSON.stringify({
						count: 1,
						currentReferenceId: 'local:room-interior',
						recentReferenceIds: ['local:street-corner'],
						preferences: { practiceMode: 'places-perspective', enabledSubjects: ['places'] }
					})
				}
			]
		]);
	});

	it('throws the app API error message when the app API rejects the request with JSON', async () => {
		const fetcher: typeof fetch = async () =>
			Response.json({ message: 'No reference providers returned references.' }, { status: 503 });

		await expect(requestReferenceFeed({ count: 1 }, { fetch: fetcher })).rejects.toThrow(
			'No reference providers returned references.'
		);
	});

	it('throws a stable fallback when the app API rejects the request without JSON', async () => {
		const fetcher: typeof fetch = async () => new Response(null, { status: 500 });

		await expect(requestReferenceFeed({ count: 1 }, { fetch: fetcher })).rejects.toThrow(
			'Could not load the next reference.'
		);
	});
});

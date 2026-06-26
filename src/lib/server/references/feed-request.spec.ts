import { describe, expect, it } from 'vitest';
import { parseReferenceFeedRequest } from './feed-request';

function expectBadRequest(callback: () => void, message: string): void {
	try {
		callback();
		expect.unreachable('Expected request parsing to fail');
	} catch (cause) {
		expect(cause).toMatchObject({ status: 400, body: { message } });
	}
}

describe('parseReferenceFeedRequest', () => {
	it('parses enabled subject preferences into canonical order and removes duplicates', () => {
		expect(
			parseReferenceFeedRequest({
				count: 2,
				currentReferenceId: 'local:room-interior',
				recentReferenceIds: ['a', 'b'],
				preferences: {
					practiceMode: 'places-perspective',
					enabledSubjects: ['nature', 'places', 'places']
				}
			})
		).toEqual({
			count: 2,
			currentReferenceId: 'local:room-interior',
			recentReferenceIds: ['a', 'b'],
			preferences: { practiceMode: 'places-perspective', enabledSubjects: ['places', 'nature'] }
		});
	});

	it('parses recent and preceding reference contexts', () => {
		expect(
			parseReferenceFeedRequest({
				recentReferences: [
					{ id: 'pexels:1', primarySubject: 'places', providerId: 'pexels' },
					{ id: 'pexels:1', primarySubject: 'places', providerId: 'pexels' }
				],
				precedingReferences: [
					{
						id: 'openverse:2',
						primarySubject: 'nature',
						topic: 'plants-flowers',
						providerId: 'openverse',
						seedId: 'nature-potted-plant',
						sceneTypes: ['interior'],
						practiceFocuses: ['shape']
					}
				]
			})
		).toEqual({
			recentReferences: [{ id: 'pexels:1', primarySubject: 'places', providerId: 'pexels' }],
			precedingReferences: [
				{
					id: 'openverse:2',
					primarySubject: 'nature',
					topic: 'plants-flowers',
					providerId: 'openverse',
					seedId: 'nature-potted-plant',
					sceneTypes: ['interior'],
					practiceFocuses: ['shape']
				}
			]
		});
	});

	it('rejects invalid reference contexts', () => {
		expectBadRequest(
			() =>
				parseReferenceFeedRequest({
					precedingReferences: [{ id: 'pexels:1', primarySubject: 'bad' }]
				}),
			'precedingReferences.primarySubject is not supported'
		);
	});

	it('rejects non-string current reference ids', () => {
		expectBadRequest(
			() => parseReferenceFeedRequest({ currentReferenceId: 123 }),
			'currentReferenceId must be a string'
		);
	});

	it('rejects empty current reference ids', () => {
		expectBadRequest(
			() => parseReferenceFeedRequest({ currentReferenceId: '' }),
			'currentReferenceId must not be empty'
		);
	});

	it('rejects unsupported enabled subjects', () => {
		expectBadRequest(
			() => parseReferenceFeedRequest({ preferences: { enabledSubjects: ['landscape'] } }),
			'subject is not supported'
		);
	});

	it('rejects unsupported practice modes', () => {
		expectBadRequest(
			() => parseReferenceFeedRequest({ preferences: { practiceMode: 'search' } }),
			'preferences.practiceMode is not supported'
		);
	});

	it('rejects non-array enabled subjects', () => {
		expectBadRequest(
			() => parseReferenceFeedRequest({ preferences: { enabledSubjects: 'places' } }),
			'preferences.enabledSubjects must be an array'
		);
	});

	it('rejects empty enabled subject preferences', () => {
		expectBadRequest(
			() => parseReferenceFeedRequest({ preferences: { enabledSubjects: [] } }),
			'preferences.enabledSubjects must include at least one subject'
		);
	});

	it('ignores unknown fields', () => {
		expect(
			parseReferenceFeedRequest({
				query: 'user query',
				provider: 'external',
				preferences: { enabledSubjects: ['places'] }
			})
		).toEqual({ preferences: { enabledSubjects: ['places'] } });
	});
});

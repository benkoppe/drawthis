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
	it('parses enabled category preferences into canonical order and removes duplicates', () => {
		expect(
			parseReferenceFeedRequest({
				count: 2,
				currentReferenceId: 'local:room-interior',
				recentReferenceIds: ['a', 'b'],
				preferences: {
					enabledSubjects: ['nature', 'places', 'places'],
					enabledTopics: ['plants-flowers', 'rooms', 'rooms']
				}
			})
		).toEqual({
			count: 2,
			currentReferenceId: 'local:room-interior',
			recentReferenceIds: ['a', 'b'],
			preferences: {
				enabledSubjects: ['places', 'nature'],
				enabledTopics: ['rooms', 'plants-flowers']
			}
		});
	});

	it('parses recent and preceding reference contexts', () => {
		expect(
			parseReferenceFeedRequest({
				recentReferences: [
					{ id: 'pexels:1', taxonomy: { primarySubject: 'places' }, providerId: 'pexels' },
					{ id: 'pexels:1', taxonomy: { primarySubject: 'places' }, providerId: 'pexels' }
				],
				precedingReferences: [
					{
						id: 'openverse:2',
						taxonomy: { primarySubject: 'nature', topic: 'plants-flowers' },
						providerId: 'openverse',
						selection: { seedId: 'nature-potted-plant' },
						training: {
							sceneTypes: ['interior'],
							focuses: ['shape'],
							complexity: 'moderate'
						}
					}
				]
			})
		).toEqual({
			recentReferences: [
				{ id: 'pexels:1', taxonomy: { primarySubject: 'places' }, providerId: 'pexels' }
			],
			precedingReferences: [
				{
					id: 'openverse:2',
					taxonomy: { primarySubject: 'nature', topic: 'plants-flowers' },
					providerId: 'openverse',
					selection: { seedId: 'nature-potted-plant' },
					training: {
						sceneTypes: ['interior'],
						focuses: ['shape'],
						complexity: 'moderate'
					}
				}
			]
		});
	});

	it('rejects invalid reference contexts', () => {
		expectBadRequest(
			() =>
				parseReferenceFeedRequest({
					precedingReferences: [{ id: 'pexels:1', taxonomy: { primarySubject: 'bad' } }]
				}),
			'precedingReferences.taxonomy.primarySubject is not supported'
		);
	});

	it('rejects a topic that does not belong to the context subject', () => {
		expectBadRequest(
			() =>
				parseReferenceFeedRequest({
					precedingReferences: [
						{ id: 'pexels:1', taxonomy: { primarySubject: 'people', topic: 'rooms' } }
					]
				}),
			'precedingReferences.taxonomy.topic does not belong to primarySubject'
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

	it('rejects unsupported enabled topics', () => {
		expectBadRequest(
			() => parseReferenceFeedRequest({ preferences: { enabledTopics: ['landscape'] } }),
			'topic is not supported'
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

	it('rejects non-array enabled topics', () => {
		expectBadRequest(
			() => parseReferenceFeedRequest({ preferences: { enabledTopics: 'rooms' } }),
			'preferences.enabledTopics must be an array'
		);
	});

	it('rejects empty enabled topic preferences', () => {
		expectBadRequest(
			() => parseReferenceFeedRequest({ preferences: { enabledTopics: [] } }),
			'preferences.enabledTopics must include at least one topic'
		);
	});

	it('rejects enabled topics that do not belong to enabled subjects', () => {
		expectBadRequest(
			() =>
				parseReferenceFeedRequest({
					preferences: { enabledSubjects: ['people'], enabledTopics: ['rooms'] }
				}),
			'preferences.enabledTopics must include at least one topic for an enabled subject'
		);
	});

	it('ignores unknown fields', () => {
		expect(
			parseReferenceFeedRequest({
				query: 'user query',
				provider: 'external',
				preferences: { enabledSubjects: ['places'], enabledTopics: ['rooms'] }
			})
		).toEqual({ preferences: { enabledSubjects: ['places'], enabledTopics: ['rooms'] } });
	});
});

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
				preferences: { enabledCategories: ['plant', 'street', 'street'] }
			})
		).toEqual({
			count: 2,
			currentReferenceId: 'local:room-interior',
			recentReferenceIds: ['a', 'b'],
			preferences: { enabledCategories: ['street', 'plant'] }
		});
	});

	it('parses recent and preceding reference contexts', () => {
		expect(
			parseReferenceFeedRequest({
				recentReferences: [
					{ id: 'pexels:1', category: 'street', providerId: 'pexels' },
					{ id: 'pexels:1', category: 'street', providerId: 'pexels' }
				],
				precedingReferences: [
					{ id: 'openverse:2', category: 'plant', providerId: 'openverse', seedId: 'plant' }
				]
			})
		).toEqual({
			recentReferences: [{ id: 'pexels:1', category: 'street', providerId: 'pexels' }],
			precedingReferences: [
				{ id: 'openverse:2', category: 'plant', providerId: 'openverse', seedId: 'plant' }
			]
		});
	});

	it('rejects invalid reference contexts', () => {
		expectBadRequest(
			() =>
				parseReferenceFeedRequest({ precedingReferences: [{ id: 'pexels:1', category: 'bad' }] }),
			'precedingReferences.category is not supported'
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

	it('rejects unsupported enabled categories', () => {
		expectBadRequest(
			() => parseReferenceFeedRequest({ preferences: { enabledCategories: ['landscape'] } }),
			'category is not supported'
		);
	});

	it('rejects non-array enabled categories', () => {
		expectBadRequest(
			() => parseReferenceFeedRequest({ preferences: { enabledCategories: 'street' } }),
			'preferences.enabledCategories must be an array'
		);
	});

	it('rejects empty enabled category preferences', () => {
		expectBadRequest(
			() => parseReferenceFeedRequest({ preferences: { enabledCategories: [] } }),
			'preferences.enabledCategories must include at least one category'
		);
	});

	it('ignores unknown fields', () => {
		expect(
			parseReferenceFeedRequest({
				query: 'user query',
				provider: 'external',
				preferences: { enabledCategories: ['street'] }
			})
		).toEqual({ preferences: { enabledCategories: ['street'] } });
	});
});

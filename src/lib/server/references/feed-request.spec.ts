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
	it('parses enabled category preferences and removes duplicates', () => {
		expect(
			parseReferenceFeedRequest({
				count: 2,
				recentReferenceIds: ['a', 'b'],
				preferences: { enabledCategories: ['street', 'street', 'plant'] }
			})
		).toEqual({
			count: 2,
			recentReferenceIds: ['a', 'b'],
			preferences: { enabledCategories: ['street', 'plant'] }
		});
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

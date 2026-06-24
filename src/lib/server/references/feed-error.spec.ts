import { describe, expect, it } from 'vitest';
import { createReferenceFeedUnavailableError, isReferenceFeedUnavailableError } from './feed-error';

describe('createReferenceFeedUnavailableError', () => {
	it('summarizes repeated provider search failures without losing causes', () => {
		const firstCause = new Error('rate limited');
		const secondCause = new Error('still rate limited');
		const error = createReferenceFeedUnavailableError([
			{ providerId: 'pexels', providerName: 'Pexels', cause: firstCause },
			{ providerId: 'pexels', providerName: 'Pexels', cause: secondCause }
		]);

		expect(isReferenceFeedUnavailableError(error)).toBe(true);
		expect(error.message).toBe(
			'No reference providers returned references. Provider failures: Pexels (pexels): 2 failed searches.'
		);
		expect(error.providerFailures).toEqual([
			{
				providerId: 'pexels',
				providerName: 'Pexels',
				attempts: 2,
				causes: [firstCause, secondCause]
			}
		]);
		expect(error.cause).toBeInstanceOf(AggregateError);
		expect((error.cause as AggregateError).errors).toEqual([firstCause, secondCause]);
	});
});

import { describe, expect, it } from 'vitest';
import { formatReferenceFeedErrorMessage } from './errors';

describe('formatReferenceFeedErrorMessage', () => {
	it('maps provider-unavailable errors to user-facing copy', () => {
		expect(
			formatReferenceFeedErrorMessage(
				'No reference providers returned references. Provider failures: Pexels (pexels): 1 failed search.'
			)
		).toBe(
			'No reference providers are available right now. Try again shortly or enable another provider.'
		);
	});

	it('preserves other errors', () => {
		expect(formatReferenceFeedErrorMessage('Could not load the next reference.')).toBe(
			'Could not load the next reference.'
		);
	});
});

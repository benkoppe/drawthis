import { describe, expect, it } from 'vitest';
import { createReferenceProviders } from './index';

describe('createReferenceProviders', () => {
	it('uses only local references when Openverse is not configured', () => {
		expect(createReferenceProviders({ references: {} }).map((provider) => provider.id)).toEqual([
			'local'
		]);
	});

	it('registers Openverse before local references when configured', () => {
		expect(
			createReferenceProviders({
				references: { openverse: { apiBaseUrl: 'https://api.openverse.org/v1' } }
			}).map((provider) => provider.id)
		).toEqual(['openverse', 'local']);
	});
});

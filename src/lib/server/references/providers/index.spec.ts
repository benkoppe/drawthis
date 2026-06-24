import { describe, expect, it } from 'vitest';
import { parseServerConfig } from '$lib/server/config';
import { createReferenceProviders } from './index';

const pexelsConfig = { apiBaseUrl: 'https://api.pexels.com/v1', apiKey: 'pexels-api-key' };
const openverseConfig = { apiBaseUrl: 'https://api.openverse.org/v1' };
const localConfig = { enabled: true as const };

describe('createReferenceProviders', () => {
	it('registers local references when local references are explicitly enabled', () => {
		expect(
			createReferenceProviders(
				parseServerConfig({ DRAWTHIS_LOCAL_REFERENCES_ENABLED: 'true' })
			).map((provider) => provider.id)
		).toEqual(['local']);
	});

	it('registers Pexels only', () => {
		expect(
			createReferenceProviders({ references: { pexels: pexelsConfig } }).map(
				(provider) => provider.id
			)
		).toEqual(['pexels']);
	});

	it('registers Openverse only', () => {
		expect(
			createReferenceProviders({ references: { openverse: openverseConfig } }).map(
				(provider) => provider.id
			)
		).toEqual(['openverse']);
	});

	it('registers local references only', () => {
		expect(
			createReferenceProviders({ references: { local: localConfig } }).map(
				(provider) => provider.id
			)
		).toEqual(['local']);
	});

	it('registers Pexels before Openverse', () => {
		expect(
			createReferenceProviders({
				references: { pexels: pexelsConfig, openverse: openverseConfig }
			}).map((provider) => provider.id)
		).toEqual(['pexels', 'openverse']);
	});

	it('registers Pexels before local references', () => {
		expect(
			createReferenceProviders({
				references: { pexels: pexelsConfig, local: localConfig }
			}).map((provider) => provider.id)
		).toEqual(['pexels', 'local']);
	});

	it('registers Openverse before local references', () => {
		expect(
			createReferenceProviders({
				references: { openverse: openverseConfig, local: localConfig }
			}).map((provider) => provider.id)
		).toEqual(['openverse', 'local']);
	});

	it('registers all configured providers in preferred order', () => {
		expect(
			createReferenceProviders({
				references: {
					pexels: pexelsConfig,
					openverse: openverseConfig,
					local: localConfig
				}
			}).map((provider) => provider.id)
		).toEqual(['pexels', 'openverse', 'local']);
	});
});

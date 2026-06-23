import { describe, expect, it } from 'vitest';
import { parseServerConfig } from './config';

describe('parseServerConfig', () => {
	it('enables only local references by default', () => {
		expect(parseServerConfig({}).references).toEqual({
			pexels: undefined,
			openverse: undefined,
			local: { enabled: true }
		});
	});

	it('keeps Pexels disabled when an API key is present without the enable toggle', () => {
		expect(parseServerConfig({ DRAWTHIS_PEXELS_API_KEY: 'pexels-key' }).references).toEqual({
			pexels: undefined,
			openverse: undefined,
			local: { enabled: true }
		});
	});

	it('keeps Pexels disabled when explicitly disabled even if an API key is present', () => {
		expect(
			parseServerConfig({
				DRAWTHIS_PEXELS_ENABLED: 'false',
				DRAWTHIS_PEXELS_API_KEY: 'pexels-key'
			}).references.pexels
		).toBeUndefined();
	});

	it('enables Pexels with the default API base URL', () => {
		expect(
			parseServerConfig({
				DRAWTHIS_PEXELS_ENABLED: 'true',
				DRAWTHIS_PEXELS_API_KEY: ' pexels-key '
			}).references.pexels
		).toEqual({
			apiKey: 'pexels-key',
			apiBaseUrl: 'https://api.pexels.com/v1'
		});
	});

	it('accepts an explicit Pexels API base URL', () => {
		expect(
			parseServerConfig({
				DRAWTHIS_PEXELS_ENABLED: '1',
				DRAWTHIS_PEXELS_API_KEY: 'pexels-key',
				DRAWTHIS_PEXELS_API_BASE_URL: 'https://example.com/pexels/'
			}).references.pexels
		).toEqual({
			apiKey: 'pexels-key',
			apiBaseUrl: 'https://example.com/pexels'
		});
	});

	it('requires an API key when Pexels is enabled', () => {
		expect(() => parseServerConfig({ DRAWTHIS_PEXELS_ENABLED: 'true' })).toThrow(
			'DRAWTHIS_PEXELS_API_KEY is required when DRAWTHIS_PEXELS_ENABLED is true'
		);
		expect(() =>
			parseServerConfig({ DRAWTHIS_PEXELS_ENABLED: 'true', DRAWTHIS_PEXELS_API_KEY: ' ' })
		).toThrow('DRAWTHIS_PEXELS_API_KEY is required when DRAWTHIS_PEXELS_ENABLED is true');
	});

	it('does not parse disabled provider API base URLs', () => {
		expect(
			parseServerConfig({
				DRAWTHIS_PEXELS_API_BASE_URL: 'not a url',
				DRAWTHIS_OPENVERSE_API_BASE_URL: 'also not a url'
			}).references
		).toEqual({
			pexels: undefined,
			openverse: undefined,
			local: { enabled: true }
		});
	});

	it('enables Openverse with the default API base URL', () => {
		expect(parseServerConfig({ DRAWTHIS_OPENVERSE_ENABLED: 'true' }).references.openverse).toEqual({
			apiBaseUrl: 'https://api.openverse.org/v1'
		});
	});

	it('accepts an explicit Openverse API base URL', () => {
		expect(
			parseServerConfig({
				DRAWTHIS_OPENVERSE_ENABLED: '1',
				DRAWTHIS_OPENVERSE_API_BASE_URL: 'https://example.com/openverse/'
			}).references.openverse
		).toEqual({
			apiBaseUrl: 'https://example.com/openverse'
		});
	});

	it('allows local references to be disabled when another provider is enabled', () => {
		expect(
			parseServerConfig({
				DRAWTHIS_OPENVERSE_ENABLED: 'true',
				DRAWTHIS_LOCAL_REFERENCES_ENABLED: 'false'
			}).references
		).toEqual({
			pexels: undefined,
			openverse: { apiBaseUrl: 'https://api.openverse.org/v1' },
			local: undefined
		});
	});

	it('rejects configs with all providers disabled', () => {
		expect(() => parseServerConfig({ DRAWTHIS_LOCAL_REFERENCES_ENABLED: 'false' })).toThrow(
			'At least one reference provider must be enabled'
		);
	});

	it('rejects invalid booleans', () => {
		expect(() => parseServerConfig({ DRAWTHIS_PEXELS_ENABLED: 'sometimes' })).toThrow(
			'DRAWTHIS_PEXELS_ENABLED must be a boolean-like value'
		);
		expect(() => parseServerConfig({ DRAWTHIS_OPENVERSE_ENABLED: 'sometimes' })).toThrow(
			'DRAWTHIS_OPENVERSE_ENABLED must be a boolean-like value'
		);
		expect(() => parseServerConfig({ DRAWTHIS_LOCAL_REFERENCES_ENABLED: 'sometimes' })).toThrow(
			'DRAWTHIS_LOCAL_REFERENCES_ENABLED must be a boolean-like value'
		);
	});

	it('rejects insecure non-localhost Pexels API base URLs when Pexels is enabled', () => {
		expect(() =>
			parseServerConfig({
				DRAWTHIS_PEXELS_ENABLED: 'true',
				DRAWTHIS_PEXELS_API_KEY: 'pexels-key',
				DRAWTHIS_PEXELS_API_BASE_URL: 'http://example.com'
			})
		).toThrow('DRAWTHIS_PEXELS_API_BASE_URL must use https unless it points at localhost');
	});

	it('rejects insecure non-localhost Openverse API base URLs when Openverse is enabled', () => {
		expect(() =>
			parseServerConfig({
				DRAWTHIS_OPENVERSE_ENABLED: 'true',
				DRAWTHIS_OPENVERSE_API_BASE_URL: 'http://example.com'
			})
		).toThrow('DRAWTHIS_OPENVERSE_API_BASE_URL must use https unless it points at localhost');
	});
});

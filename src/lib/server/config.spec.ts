import { describe, expect, it } from 'vitest';
import { parseServerConfig } from './config';

describe('parseServerConfig', () => {
	it('leaves external providers disabled by default', () => {
		expect(parseServerConfig({}).references).toEqual({
			pexels: undefined,
			openverse: undefined
		});
	});

	it('enables Pexels automatically when an API key is present', () => {
		expect(
			parseServerConfig({ DRAWTHIS_PEXELS_API_KEY: ' pexels-key ' }).references.pexels
		).toEqual({
			apiKey: 'pexels-key',
			apiBaseUrl: 'https://api.pexels.com/v1'
		});
	});

	it('accepts an explicit Pexels API base URL', () => {
		expect(
			parseServerConfig({
				DRAWTHIS_PEXELS_API_KEY: 'pexels-key',
				DRAWTHIS_PEXELS_API_BASE_URL: 'https://example.com/pexels/'
			}).references.pexels
		).toEqual({
			apiKey: 'pexels-key',
			apiBaseUrl: 'https://example.com/pexels'
		});
	});

	it('does not parse the Pexels API base URL when Pexels is disabled', () => {
		expect(
			parseServerConfig({ DRAWTHIS_PEXELS_API_BASE_URL: 'not a url' }).references.pexels
		).toBeUndefined();
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

	it('rejects invalid booleans', () => {
		expect(() => parseServerConfig({ DRAWTHIS_OPENVERSE_ENABLED: 'sometimes' })).toThrow(
			'DRAWTHIS_OPENVERSE_ENABLED must be a boolean-like value'
		);
	});

	it('rejects insecure non-localhost Pexels API base URLs', () => {
		expect(() =>
			parseServerConfig({
				DRAWTHIS_PEXELS_API_KEY: 'pexels-key',
				DRAWTHIS_PEXELS_API_BASE_URL: 'http://example.com'
			})
		).toThrow('DRAWTHIS_PEXELS_API_BASE_URL must use https unless it points at localhost');
	});

	it('rejects insecure non-localhost Openverse API base URLs', () => {
		expect(() =>
			parseServerConfig({
				DRAWTHIS_OPENVERSE_ENABLED: 'true',
				DRAWTHIS_OPENVERSE_API_BASE_URL: 'http://example.com'
			})
		).toThrow('DRAWTHIS_OPENVERSE_API_BASE_URL must use https unless it points at localhost');
	});
});

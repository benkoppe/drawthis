import { describe, expect, it } from 'vitest';
import { parseServerConfig } from './config';

describe('parseServerConfig', () => {
	it('leaves Openverse disabled by default', () => {
		expect(parseServerConfig({}).references.openverse).toBeUndefined();
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

	it('rejects insecure non-localhost API base URLs', () => {
		expect(() =>
			parseServerConfig({
				DRAWTHIS_OPENVERSE_ENABLED: 'true',
				DRAWTHIS_OPENVERSE_API_BASE_URL: 'http://example.com'
			})
		).toThrow('DRAWTHIS_OPENVERSE_API_BASE_URL must use https unless it points at localhost');
	});
});

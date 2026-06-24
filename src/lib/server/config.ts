import {
	DRAWTHIS_LOCAL_REFERENCES_ENABLED,
	DRAWTHIS_OPENVERSE_API_BASE_URL,
	DRAWTHIS_OPENVERSE_ENABLED,
	DRAWTHIS_PEXELS_API_BASE_URL,
	DRAWTHIS_PEXELS_API_KEY,
	DRAWTHIS_PEXELS_ENABLED
} from '$app/env/private';

const defaultPexelsApiBaseUrl = 'https://api.pexels.com/v1';
const defaultOpenverseApiBaseUrl = 'https://api.openverse.org/v1';

export interface PexelsProviderConfig {
	apiBaseUrl: string;
	apiKey: string;
}

export interface OpenverseProviderConfig {
	apiBaseUrl: string;
}

export interface LocalProviderConfig {
	enabled: true;
}

export interface ServerConfig {
	references: {
		pexels?: PexelsProviderConfig;
		openverse?: OpenverseProviderConfig;
		local?: LocalProviderConfig;
	};
}

function parseOptionalBoolean(value: string | undefined, name: string): boolean | undefined {
	if (value === undefined || value.trim() === '') {
		return undefined;
	}

	switch (value.trim().toLowerCase()) {
		case '1':
		case 'true':
		case 'yes':
		case 'on':
			return true;
		case '0':
		case 'false':
		case 'no':
		case 'off':
			return false;
		default:
			throw new Error(`${name} must be a boolean-like value`);
	}
}

function parseOptionalUrl(value: string | undefined, fallback: string, name: string): string {
	const url = value?.trim() || fallback;

	let parsed: URL;

	try {
		parsed = new URL(url);
	} catch (cause) {
		throw new Error(`${name} must be a valid URL`, { cause });
	}

	if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
		throw new Error(`${name} must use https unless it points at localhost`);
	}

	return parsed.toString().replace(/\/$/, '');
}

function requireNonEmptyValue(value: string | undefined, message: string): string {
	if (value === undefined || value.length === 0) {
		throw new Error(message);
	}

	return value;
}

export function parseServerConfig(
	environment: Partial<Record<string, string | undefined>>
): ServerConfig {
	const pexelsEnabled =
		parseOptionalBoolean(environment.DRAWTHIS_PEXELS_ENABLED, 'DRAWTHIS_PEXELS_ENABLED') ?? false;
	const openverseEnabled =
		parseOptionalBoolean(environment.DRAWTHIS_OPENVERSE_ENABLED, 'DRAWTHIS_OPENVERSE_ENABLED') ??
		false;
	const localEnabled =
		parseOptionalBoolean(
			environment.DRAWTHIS_LOCAL_REFERENCES_ENABLED,
			'DRAWTHIS_LOCAL_REFERENCES_ENABLED'
		) ?? false;
	const pexelsApiKey = environment.DRAWTHIS_PEXELS_API_KEY?.trim();
	const pexels = pexelsEnabled
		? {
				apiKey: requireNonEmptyValue(
					pexelsApiKey,
					'DRAWTHIS_PEXELS_API_KEY is required when DRAWTHIS_PEXELS_ENABLED is true'
				),
				apiBaseUrl: parseOptionalUrl(
					environment.DRAWTHIS_PEXELS_API_BASE_URL,
					defaultPexelsApiBaseUrl,
					'DRAWTHIS_PEXELS_API_BASE_URL'
				)
			}
		: undefined;
	const openverse = openverseEnabled
		? {
				apiBaseUrl: parseOptionalUrl(
					environment.DRAWTHIS_OPENVERSE_API_BASE_URL,
					defaultOpenverseApiBaseUrl,
					'DRAWTHIS_OPENVERSE_API_BASE_URL'
				)
			}
		: undefined;
	const local = localEnabled ? { enabled: true as const } : undefined;

	if (pexels === undefined && openverse === undefined && local === undefined) {
		throw new Error('At least one reference provider must be enabled');
	}

	return {
		references: {
			pexels,
			openverse,
			local
		}
	};
}

export function getServerConfig(): ServerConfig {
	return parseServerConfig({
		DRAWTHIS_PEXELS_ENABLED,
		DRAWTHIS_PEXELS_API_KEY,
		DRAWTHIS_PEXELS_API_BASE_URL,
		DRAWTHIS_OPENVERSE_ENABLED,
		DRAWTHIS_OPENVERSE_API_BASE_URL,
		DRAWTHIS_LOCAL_REFERENCES_ENABLED
	});
}

import {
	DRAWTHIS_OPENVERSE_API_BASE_URL,
	DRAWTHIS_OPENVERSE_ENABLED,
	DRAWTHIS_PEXELS_API_BASE_URL,
	DRAWTHIS_PEXELS_API_KEY
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

export interface ServerConfig {
	references: {
		pexels?: PexelsProviderConfig;
		openverse?: OpenverseProviderConfig;
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

export function parseServerConfig(
	environment: Partial<Record<string, string | undefined>>
): ServerConfig {
	const pexelsApiKey = environment.DRAWTHIS_PEXELS_API_KEY?.trim();
	const openverseEnabled = parseOptionalBoolean(
		environment.DRAWTHIS_OPENVERSE_ENABLED,
		'DRAWTHIS_OPENVERSE_ENABLED'
	);

	return {
		references: {
			pexels:
				pexelsApiKey !== undefined && pexelsApiKey.length > 0
					? {
							apiKey: pexelsApiKey,
							apiBaseUrl: parseOptionalUrl(
								environment.DRAWTHIS_PEXELS_API_BASE_URL,
								defaultPexelsApiBaseUrl,
								'DRAWTHIS_PEXELS_API_BASE_URL'
							)
						}
					: undefined,
			openverse:
				openverseEnabled === true
					? {
							apiBaseUrl: parseOptionalUrl(
								environment.DRAWTHIS_OPENVERSE_API_BASE_URL,
								defaultOpenverseApiBaseUrl,
								'DRAWTHIS_OPENVERSE_API_BASE_URL'
							)
						}
					: undefined
		}
	};
}

export const serverConfig = parseServerConfig({
	DRAWTHIS_PEXELS_API_KEY,
	DRAWTHIS_PEXELS_API_BASE_URL,
	DRAWTHIS_OPENVERSE_ENABLED,
	DRAWTHIS_OPENVERSE_API_BASE_URL
});

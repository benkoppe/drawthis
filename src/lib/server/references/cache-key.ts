import type { ProviderSearchRequest, ReferenceProvider } from './provider';

const cacheKeyVersion = 1;

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue | undefined };

function stableJson(value: JsonValue): string {
	if (value === null || typeof value !== 'object') {
		return JSON.stringify(value);
	}

	if (Array.isArray(value)) {
		return `[${value.map((item) => stableJson(item)).join(',')}]`;
	}

	return `{${Object.keys(value)
		.sort()
		.filter((key) => value[key] !== undefined)
		.map((key) => `${JSON.stringify(key)}:${stableJson(value[key] as JsonValue)}`)
		.join(',')}}`;
}

export function makeProviderSearchCacheKey(
	provider: ReferenceProvider,
	request: ProviderSearchRequest
): string {
	return stableJson({
		version: cacheKeyVersion,
		providerId: provider.id,
		request: {
			category: request.category,
			count: request.count,
			cursor: request.cursor,
			orientation: request.orientation,
			query: request.query
		}
	});
}

import type { ProviderSearchRequest, ProviderSearchResult } from './provider';

export interface CachedProviderSearchResult {
	version: 1;
	providerId: string;
	request: ProviderSearchRequest;
	result: ProviderSearchResult;
	cachedAt: number;
	expiresAt: number;
	staleUntil: number;
}

export interface ReferenceSearchCache {
	get(key: string): Promise<CachedProviderSearchResult | undefined>;
	getStale(key: string): Promise<CachedProviderSearchResult | undefined>;
	set(
		key: string,
		value: CachedProviderSearchResult,
		options: { ttlSeconds: number; staleTtlSeconds: number }
	): Promise<void>;
}

const memoryCacheEntries = new Map<string, CachedProviderSearchResult>();

function isUsableCacheEntry(
	entry: CachedProviderSearchResult | undefined,
	options: { allowStale: boolean },
	now = Date.now()
): entry is CachedProviderSearchResult {
	if (entry === undefined || entry.version !== 1) {
		return false;
	}

	return now <= (options.allowStale ? entry.staleUntil : entry.expiresAt);
}

function pruneExpiredMemoryEntries(now = Date.now()): void {
	for (const [key, entry] of memoryCacheEntries) {
		if (entry.staleUntil < now) {
			memoryCacheEntries.delete(key);
		}
	}
}

export function createMemoryReferenceSearchCache(): ReferenceSearchCache {
	return {
		async get(key) {
			const entry = memoryCacheEntries.get(key);
			return isUsableCacheEntry(entry, { allowStale: false }) ? entry : undefined;
		},
		async getStale(key) {
			const entry = memoryCacheEntries.get(key);
			return isUsableCacheEntry(entry, { allowStale: true }) ? entry : undefined;
		},
		async set(key, value) {
			pruneExpiredMemoryEntries();
			memoryCacheEntries.set(key, value);
		}
	};
}

export interface CloudflareCacheStorageLike {
	default: Cache;
}

function makeCacheRequest(key: string): Request {
	return new Request(`https://drawthis.invalid/reference-search-cache/${encodeURIComponent(key)}`, {
		method: 'GET'
	});
}

function isCachedProviderSearchResult(value: unknown): value is CachedProviderSearchResult {
	if (value === null || typeof value !== 'object') {
		return false;
	}

	const candidate = value as Partial<CachedProviderSearchResult>;

	return (
		candidate.version === 1 &&
		typeof candidate.providerId === 'string' &&
		typeof candidate.cachedAt === 'number' &&
		typeof candidate.expiresAt === 'number' &&
		typeof candidate.staleUntil === 'number' &&
		candidate.request !== undefined &&
		candidate.result !== undefined
	);
}

export function createCloudflareReferenceSearchCache(
	cacheStorage: CloudflareCacheStorageLike | undefined
): ReferenceSearchCache | undefined {
	const maybeCache = cacheStorage?.default;

	if (maybeCache === undefined) {
		return undefined;
	}

	const cache = maybeCache;

	async function read(key: string, options: { allowStale: boolean }) {
		const response = await cache.match(makeCacheRequest(key));

		if (response === undefined) {
			return undefined;
		}

		const value: unknown = await response.json().catch(() => undefined);

		if (!isCachedProviderSearchResult(value)) {
			return undefined;
		}

		return isUsableCacheEntry(value, options) ? value : undefined;
	}

	return {
		get(key) {
			return read(key, { allowStale: false });
		},
		getStale(key) {
			return read(key, { allowStale: true });
		},
		async set(key, value, options) {
			const cacheLifetimeSeconds = Math.max(1, options.ttlSeconds + options.staleTtlSeconds);
			const response = new Response(JSON.stringify(value), {
				headers: {
					'cache-control': `public, max-age=${cacheLifetimeSeconds}`,
					'content-type': 'application/json'
				}
			});

			await cache.put(makeCacheRequest(key), response);
		}
	};
}

export function createReferenceSearchCache(
	platform: App.Platform | undefined
): ReferenceSearchCache {
	return (
		createCloudflareReferenceSearchCache(
			platform?.caches as CloudflareCacheStorageLike | undefined
		) ?? createMemoryReferenceSearchCache()
	);
}

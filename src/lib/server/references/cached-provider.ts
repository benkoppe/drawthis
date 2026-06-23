import type { ReferenceSearchCache } from './cache';
import { makeProviderSearchCacheKey } from './cache-key';
import { isReferenceProviderHttpError } from './provider-error';
import type { ProviderSearchRequest, ProviderSearchResult, ReferenceProvider } from './provider';

const defaultMetadataTtlSeconds = 300;
const defaultStaleTtlSeconds = 86_400;
const defaultRateLimitCooldownSeconds = 60;
const maxRateLimitCooldownSeconds = 3_600;

const inFlightSearches = new Map<string, Promise<ProviderSearchResult>>();
const providerCooldowns = new Map<string, number>();

function getNow(): number {
	return Date.now();
}

function getProviderCooldownRemainingSeconds(provider: ReferenceProvider, now = getNow()): number {
	const cooldownUntil = providerCooldowns.get(provider.id);

	if (cooldownUntil === undefined || cooldownUntil <= now) {
		return 0;
	}

	return Math.ceil((cooldownUntil - now) / 1000);
}

function setProviderCooldown(provider: ReferenceProvider, seconds: number, now = getNow()): void {
	const boundedSeconds = Math.min(Math.max(seconds, 1), maxRateLimitCooldownSeconds);
	providerCooldowns.set(provider.id, now + boundedSeconds * 1000);
}

function shouldCooldownProvider(cause: unknown): boolean {
	return isReferenceProviderHttpError(cause) && (cause.status === 429 || cause.status >= 500);
}

function getCooldownSeconds(cause: unknown): number {
	if (isReferenceProviderHttpError(cause)) {
		return cause.retryAfterSeconds ?? defaultRateLimitCooldownSeconds;
	}

	return defaultRateLimitCooldownSeconds;
}

async function getCachedResult(
	cache: ReferenceSearchCache,
	key: string,
	options: { allowStale: boolean }
): Promise<ProviderSearchResult | undefined> {
	try {
		const entry = options.allowStale ? await cache.getStale(key) : await cache.get(key);
		return entry?.result;
	} catch (cause) {
		console.warn('Reference search cache read failed', cause);
		return undefined;
	}
}

async function searchAndCacheProvider(
	provider: ReferenceProvider,
	request: ProviderSearchRequest,
	cache: ReferenceSearchCache,
	key: string
): Promise<ProviderSearchResult> {
	const result = await provider.search(request);
	const metadataTtlSeconds = result.cachePolicy?.metadataTtlSeconds ?? defaultMetadataTtlSeconds;

	if (metadataTtlSeconds > 0) {
		const now = getNow();

		try {
			await cache.set(
				key,
				{
					version: 1,
					providerId: provider.id,
					request,
					result,
					cachedAt: now,
					expiresAt: now + metadataTtlSeconds * 1000,
					staleUntil: now + (metadataTtlSeconds + defaultStaleTtlSeconds) * 1000
				},
				{ ttlSeconds: metadataTtlSeconds, staleTtlSeconds: defaultStaleTtlSeconds }
			);
		} catch (cause) {
			console.warn('Reference search cache write failed', cause);
		}
	}

	return result;
}

export async function searchReferenceProvider(
	provider: ReferenceProvider,
	request: ProviderSearchRequest,
	cache: ReferenceSearchCache | undefined
): Promise<ProviderSearchResult> {
	if (cache === undefined) {
		return provider.search(request);
	}

	const key = makeProviderSearchCacheKey(provider, request);
	const cached = await getCachedResult(cache, key, { allowStale: false });

	if (cached !== undefined) {
		return cached;
	}

	if (getProviderCooldownRemainingSeconds(provider) > 0) {
		const stale = await getCachedResult(cache, key, { allowStale: true });

		if (stale !== undefined) {
			return stale;
		}

		throw new Error(`Reference provider "${provider.id}" is temporarily cooling down`);
	}

	let inFlightSearch = inFlightSearches.get(key);

	if (inFlightSearch === undefined) {
		inFlightSearch = searchAndCacheProvider(provider, request, cache, key).finally(() => {
			inFlightSearches.delete(key);
		});
		inFlightSearches.set(key, inFlightSearch);
	}

	try {
		return await inFlightSearch;
	} catch (cause) {
		if (shouldCooldownProvider(cause)) {
			setProviderCooldown(provider, getCooldownSeconds(cause));
		}

		const stale = await getCachedResult(cache, key, { allowStale: true });

		if (stale !== undefined) {
			return stale;
		}

		throw cause;
	}
}

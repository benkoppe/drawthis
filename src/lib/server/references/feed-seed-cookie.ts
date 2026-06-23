import type { Cookies } from '@sveltejs/kit';

export const referenceFeedSeedCookieName = 'drawthis_feed_seed';

const referenceFeedSeedCookieMaxAgeSeconds = 60 * 60 * 24 * 365;
const maxReferenceFeedSeedLength = 128;
const referenceFeedSeedPattern = /^[A-Za-z0-9_-]+$/;

function isValidReferenceFeedSeed(value: string | undefined): value is string {
	return (
		value !== undefined &&
		value.length > 0 &&
		value.length <= maxReferenceFeedSeedLength &&
		referenceFeedSeedPattern.test(value)
	);
}

export function writeReferenceFeedSeedCookie(cookies: Pick<Cookies, 'set'>, seed: string): void {
	cookies.set(referenceFeedSeedCookieName, seed, {
		httpOnly: true,
		maxAge: referenceFeedSeedCookieMaxAgeSeconds,
		path: '/',
		sameSite: 'lax'
	});
}

export function readOrCreateReferenceFeedSeedCookie(
	cookies: Pick<Cookies, 'get' | 'set'>,
	generateSeed: () => string = () => crypto.randomUUID()
): string {
	const existingSeed = cookies.get(referenceFeedSeedCookieName)?.trim();

	if (isValidReferenceFeedSeed(existingSeed)) {
		return existingSeed;
	}

	const generatedSeed = generateSeed();
	const seed = isValidReferenceFeedSeed(generatedSeed) ? generatedSeed : crypto.randomUUID();

	writeReferenceFeedSeedCookie(cookies, seed);

	return seed;
}

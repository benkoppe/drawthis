import {
	parseRecentReferenceIds,
	referenceHistoryCookieName,
	serializeRecentReferenceIds
} from '$lib/references';
import type { Cookies } from '@sveltejs/kit';

const referenceHistoryCookieMaxAgeSeconds = 60 * 60 * 24 * 30;

export function readRecentReferenceIdsCookie(cookies: Pick<Cookies, 'get'>): string[] {
	return parseRecentReferenceIds(cookies.get(referenceHistoryCookieName));
}

export function writeRecentReferenceIdsCookie(
	cookies: Pick<Cookies, 'set'>,
	referenceIds: readonly string[]
): void {
	cookies.set(referenceHistoryCookieName, serializeRecentReferenceIds(referenceIds), {
		httpOnly: true,
		maxAge: referenceHistoryCookieMaxAgeSeconds,
		path: '/',
		sameSite: 'lax'
	});
}

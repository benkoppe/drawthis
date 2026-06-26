import {
	compactReferenceFeedContextItem,
	parseRecentReferenceContexts,
	parseRecentReferenceIds,
	referenceContextHistoryCookieName,
	referenceHistoryCookieName,
	serializeRecentReferenceContexts,
	serializeRecentReferenceIds,
	type ReferenceFeedContextItem
} from '$lib/references';
import type { Cookies } from '@sveltejs/kit';

const referenceHistoryCookieMaxAgeSeconds = 60 * 60 * 24 * 30;
const maxReferenceContextCookieValueLength = 1_500;

const referenceHistoryCookieOptions = {
	httpOnly: true,
	maxAge: referenceHistoryCookieMaxAgeSeconds,
	path: '/',
	sameSite: 'lax'
} as const;

export function readRecentReferenceIdsCookie(cookies: Pick<Cookies, 'get'>): string[] {
	return parseRecentReferenceIds(cookies.get(referenceHistoryCookieName));
}

export function writeRecentReferenceIdsCookie(
	cookies: Pick<Cookies, 'set'>,
	referenceIds: readonly string[]
): void {
	cookies.set(
		referenceHistoryCookieName,
		serializeRecentReferenceIds(referenceIds),
		referenceHistoryCookieOptions
	);
}

export function readRecentReferenceContextsCookie(
	cookies: Pick<Cookies, 'get'>
): ReferenceFeedContextItem[] {
	return parseRecentReferenceContexts(cookies.get(referenceContextHistoryCookieName));
}

function serializeRecentReferenceContextsCookieValue(
	referenceContexts: readonly ReferenceFeedContextItem[]
): string {
	let compactContexts = referenceContexts.map(compactReferenceFeedContextItem);
	let serializedValue = serializeRecentReferenceContexts(compactContexts);

	while (
		serializedValue.length > maxReferenceContextCookieValueLength &&
		compactContexts.length > 0
	) {
		compactContexts = compactContexts.slice(1);
		serializedValue = serializeRecentReferenceContexts(compactContexts);
	}

	return serializedValue;
}

export function writeRecentReferenceContextsCookie(
	cookies: Pick<Cookies, 'set'>,
	referenceContexts: readonly ReferenceFeedContextItem[]
): void {
	cookies.set(
		referenceContextHistoryCookieName,
		serializeRecentReferenceContextsCookieValue(referenceContexts),
		referenceHistoryCookieOptions
	);
}

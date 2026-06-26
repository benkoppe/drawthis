import {
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

function compactReferenceContextForCookie(
	referenceContext: ReferenceFeedContextItem
): ReferenceFeedContextItem {
	const compactContext: ReferenceFeedContextItem = {
		id: referenceContext.id,
		taxonomy: {
			primarySubject: referenceContext.taxonomy.primarySubject
		}
	};

	if (referenceContext.taxonomy.topic !== undefined) {
		compactContext.taxonomy.topic = referenceContext.taxonomy.topic;
	}

	if (referenceContext.providerId !== undefined) {
		compactContext.providerId = referenceContext.providerId;
	}

	if (referenceContext.selection?.seedId !== undefined) {
		compactContext.selection = { seedId: referenceContext.selection.seedId };
	}

	return compactContext;
}

export function writeRecentReferenceContextsCookie(
	cookies: Pick<Cookies, 'set'>,
	referenceContexts: readonly ReferenceFeedContextItem[]
): void {
	cookies.set(
		referenceContextHistoryCookieName,
		serializeRecentReferenceContexts(referenceContexts.map(compactReferenceContextForCookie)),
		referenceHistoryCookieOptions
	);
}

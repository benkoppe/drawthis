import { referenceSubjects, type DrawingReference } from '$lib/references';
import type { OpenverseProviderConfig } from '$lib/server/config';
import { parseRetryAfterSeconds, ReferenceProviderHttpError } from '../provider-error';
import type { ProviderSearchRequest, ProviderSearchResult, ReferenceProvider } from '../provider';
import {
	getBoolean,
	getNonEmptyString,
	getPositiveInteger,
	getPositiveNumber,
	isRecord,
	normalizePageCursor
} from './parsing';

const openverseProviderId = 'openverse';
const openverseProviderName = 'Openverse';
const openverseMetadataTtlSeconds = 3_600;

type OpenverseAspectRatio = 'wide' | 'tall' | 'square';

type FetchFunction = typeof fetch;

interface OpenverseImage {
	id: string;
	title?: string;
	foreignLandingUrl: string;
	imageUrl: string;
	creator?: string;
	creatorUrl?: string;
	license?: string;
	licenseVersion?: string;
	licenseUrl?: string;
	attribution?: string;
	width?: number;
	height?: number;
}

interface OpenverseSearchResponse {
	results: OpenverseImage[];
	page?: number;
	pageCount?: number;
}

export interface OpenverseReferenceProviderOptions extends OpenverseProviderConfig {
	fetch?: FetchFunction;
}

function parseOpenverseImage(value: unknown): OpenverseImage | undefined {
	if (!isRecord(value) || getBoolean(value, 'mature') === true) {
		return undefined;
	}

	const id = getNonEmptyString(value, 'id');
	const imageUrl = getNonEmptyString(value, 'url') ?? getNonEmptyString(value, 'thumbnail');
	const foreignLandingUrl =
		getNonEmptyString(value, 'foreign_landing_url') ?? getNonEmptyString(value, 'detail_url');

	if (!id || !imageUrl || !foreignLandingUrl) {
		return undefined;
	}

	return {
		id,
		foreignLandingUrl,
		imageUrl,
		title: getNonEmptyString(value, 'title'),
		creator: getNonEmptyString(value, 'creator'),
		creatorUrl: getNonEmptyString(value, 'creator_url'),
		license: getNonEmptyString(value, 'license'),
		licenseVersion: getNonEmptyString(value, 'license_version'),
		licenseUrl: getNonEmptyString(value, 'license_url'),
		attribution: getNonEmptyString(value, 'attribution'),
		width: getPositiveNumber(value, 'width'),
		height: getPositiveNumber(value, 'height')
	};
}

function parseOpenverseSearchResponse(value: unknown): OpenverseSearchResponse {
	if (!isRecord(value) || !Array.isArray(value.results)) {
		throw new Error('Openverse returned an unexpected response shape');
	}

	return {
		results: value.results.flatMap((result) => {
			const image = parseOpenverseImage(result);
			return image ? [image] : [];
		}),
		page: getPositiveInteger(value.page),
		pageCount: getPositiveInteger(value.page_count)
	};
}

function toAspectRatio(request: ProviderSearchRequest): OpenverseAspectRatio | undefined {
	switch (request.orientation) {
		case 'landscape':
			return 'wide';
		case 'portrait':
			return 'tall';
		case 'square':
			return 'square';
		case 'any':
		case undefined:
			return undefined;
	}
}

function buildOpenverseSearchUrl(
	config: OpenverseProviderConfig,
	request: ProviderSearchRequest
): URL {
	const apiBaseUrl = config.apiBaseUrl.replace(/\/$/, '');
	const url = new URL(`${apiBaseUrl}/images/`);
	const aspectRatio = toAspectRatio(request);

	url.searchParams.set('format', 'json');
	url.searchParams.set('page_size', String(request.count));
	url.searchParams.set('page', normalizePageCursor(request.cursor));
	url.searchParams.set('mature', 'false');
	url.searchParams.set('category', 'photograph');

	if (request.query !== undefined && request.query.trim().length > 0) {
		url.searchParams.set('q', request.query.trim());
	}

	if (aspectRatio !== undefined) {
		url.searchParams.set('aspect_ratio', aspectRatio);
	}

	return url;
}

function formatLicenseName(
	license: string | undefined,
	version: string | undefined
): string | undefined {
	if (license === undefined) {
		return undefined;
	}

	const normalizedLicense = license.toLowerCase();
	const versionSuffix = version ? ` ${version}` : '';

	if (normalizedLicense === 'cc0') {
		return `CC0${versionSuffix}`;
	}

	if (normalizedLicense === 'pdm') {
		return `Public Domain Mark${versionSuffix}`;
	}

	return `CC ${normalizedLicense.toUpperCase()}${versionSuffix}`;
}

function makeFallbackAttributionLabel(
	image: OpenverseImage,
	licenseName: string | undefined
): string {
	const title = image.title ? `“${image.title}”` : 'Untitled image';
	const creator = image.creator ? ` by ${image.creator}` : '';
	const license = licenseName ? ` (${licenseName})` : '';

	return `${title}${creator}${license} via Openverse`;
}

function makeAltText(image: OpenverseImage): string {
	if (image.title && image.creator) {
		return `${image.title} by ${image.creator}`;
	}

	return image.title ?? 'Openverse drawing reference image';
}

function toDrawingReference(
	image: OpenverseImage,
	request: ProviderSearchRequest
): DrawingReference {
	const primarySubject = request.primarySubject;

	if (primarySubject === undefined) {
		throw new Error('Openverse search requires a planned reference subject');
	}

	const licenseName = formatLicenseName(image.license, image.licenseVersion);
	const referenceImage: DrawingReference['image'] = {
		url: image.imageUrl,
		alt: makeAltText(image)
	};
	const attribution: DrawingReference['attribution'] = {
		label: image.attribution ?? makeFallbackAttributionLabel(image, licenseName),
		sourceName: openverseProviderName,
		sourceUrl: image.foreignLandingUrl
	};

	if (image.width !== undefined) {
		referenceImage.width = image.width;
	}

	if (image.height !== undefined) {
		referenceImage.height = image.height;
	}

	if (image.creator !== undefined) {
		attribution.creatorName = image.creator;
	}

	if (image.creatorUrl !== undefined) {
		attribution.creatorUrl = image.creatorUrl;
	}

	if (licenseName !== undefined) {
		attribution.licenseName = licenseName;
	}

	if (image.licenseUrl !== undefined) {
		attribution.licenseUrl = image.licenseUrl;
	}

	const taxonomy: DrawingReference['taxonomy'] = {
		primarySubject,
		secondarySubjects: request.secondarySubjects
	};
	const training: DrawingReference['training'] = {
		focuses: request.practiceFocuses,
		sceneTypes: request.sceneTypes,
		complexity: request.complexity
	};

	if (request.topic !== undefined) {
		taxonomy.topic = request.topic;
	}

	return {
		id: `${openverseProviderId}:${image.id}`,
		provider: {
			id: openverseProviderId,
			name: openverseProviderName,
			referenceId: image.id
		},
		title: image.title ?? 'Untitled Openverse image',
		taxonomy,
		training,
		selection: request.seed === undefined ? undefined : { seed: request.seed },
		image: referenceImage,
		attribution
	};
}

async function searchOpenverse(
	config: OpenverseProviderConfig,
	fetchFunction: FetchFunction,
	request: ProviderSearchRequest
): Promise<ProviderSearchResult> {
	if (request.primarySubject === undefined) {
		throw new Error('Openverse search requires a planned reference subject');
	}

	const response = await fetchFunction(buildOpenverseSearchUrl(config, request), {
		headers: { Accept: 'application/json' }
	});

	if (!response.ok) {
		throw new ReferenceProviderHttpError(`Openverse search failed with status ${response.status}`, {
			status: response.status,
			retryAfterSeconds: parseRetryAfterSeconds(response.headers.get('retry-after'))
		});
	}

	const body: unknown = await response.json();
	const parsedResponse = parseOpenverseSearchResponse(body);
	const nextCursor =
		parsedResponse.page !== undefined &&
		parsedResponse.pageCount !== undefined &&
		parsedResponse.page < parsedResponse.pageCount
			? String(parsedResponse.page + 1)
			: undefined;

	return {
		references: parsedResponse.results.map((image) => toDrawingReference(image, request)),
		nextCursor,
		cachePolicy: {
			metadataTtlSeconds: openverseMetadataTtlSeconds,
			canCacheImageBytes: false
		}
	};
}

export function createOpenverseReferenceProvider(
	options: OpenverseReferenceProviderOptions
): ReferenceProvider {
	const fetchFunction = options.fetch ?? fetch;

	return {
		id: openverseProviderId,
		name: openverseProviderName,
		capabilities: {
			subjects: referenceSubjects,
			supportsSearch: true,
			supportsPagination: true,
			supportsOrientation: true,
			attributionRequired: true
		},
		search(request) {
			return searchOpenverse(options, fetchFunction, request);
		}
	} satisfies ReferenceProvider;
}

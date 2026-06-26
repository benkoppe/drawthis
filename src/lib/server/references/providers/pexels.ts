import { referenceSubjects, type DrawingReference } from '$lib/references';
import type { PexelsProviderConfig } from '$lib/server/config';
import { parseRetryAfterSeconds, ReferenceProviderHttpError } from '../provider-error';
import type { ProviderSearchRequest, ProviderSearchResult, ReferenceProvider } from '../provider';
import {
	getNonEmptyString,
	getPositiveInteger,
	getPositiveNumber,
	isRecord,
	normalizePageCursor
} from './parsing';

const pexelsProviderId = 'pexels';
const pexelsProviderName = 'Pexels';
const pexelsLicenseName = 'Pexels License';
const pexelsLicenseUrl = 'https://www.pexels.com/license';
const pexelsMetadataTtlSeconds = 3_600;

type FetchFunction = typeof fetch;

interface PexelsPhotoSource {
	original?: string;
	large2x?: string;
	large?: string;
	medium?: string;
	small?: string;
	portrait?: string;
	landscape?: string;
	tiny?: string;
}

interface PexelsPhoto {
	id: string;
	width?: number;
	height?: number;
	url: string;
	photographer?: string;
	photographerUrl?: string;
	alt?: string;
	imageUrl: string;
}

interface PexelsSearchResponse {
	photos: PexelsPhoto[];
	page?: number;
	perPage?: number;
	totalResults?: number;
	nextPage?: string;
}

export interface PexelsReferenceProviderOptions extends PexelsProviderConfig {
	fetch?: FetchFunction;
}

function getPhotoId(record: Record<string, unknown>): string | undefined {
	const id = record.id;

	if (typeof id === 'number' && Number.isInteger(id) && id > 0) {
		return String(id);
	}

	return getNonEmptyString(record, 'id');
}

function parsePexelsPhotoSource(value: unknown): PexelsPhotoSource | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	return {
		original: getNonEmptyString(value, 'original'),
		large2x: getNonEmptyString(value, 'large2x'),
		large: getNonEmptyString(value, 'large'),
		medium: getNonEmptyString(value, 'medium'),
		small: getNonEmptyString(value, 'small'),
		portrait: getNonEmptyString(value, 'portrait'),
		landscape: getNonEmptyString(value, 'landscape'),
		tiny: getNonEmptyString(value, 'tiny')
	};
}

function chooseImageUrl(source: PexelsPhotoSource): string | undefined {
	return (
		source.large2x ??
		source.large ??
		source.original ??
		source.medium ??
		source.landscape ??
		source.portrait ??
		source.small ??
		source.tiny
	);
}

function parsePexelsPhoto(value: unknown): PexelsPhoto | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const id = getPhotoId(value);
	const url = getNonEmptyString(value, 'url');
	const source = parsePexelsPhotoSource(value.src);
	const imageUrl = source ? chooseImageUrl(source) : undefined;

	if (!id || !url || !imageUrl) {
		return undefined;
	}

	return {
		id,
		url,
		imageUrl,
		photographer: getNonEmptyString(value, 'photographer'),
		photographerUrl: getNonEmptyString(value, 'photographer_url'),
		alt: getNonEmptyString(value, 'alt'),
		width: getPositiveNumber(value, 'width'),
		height: getPositiveNumber(value, 'height')
	};
}

function parseNextPageCursor(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	try {
		const page = new URL(value).searchParams.get('page');
		return page && /^\d+$/.test(page) && Number.parseInt(page, 10) > 0 ? page : undefined;
	} catch {
		return undefined;
	}
}

function parsePexelsSearchResponse(value: unknown): PexelsSearchResponse {
	if (!isRecord(value) || !Array.isArray(value.photos)) {
		throw new Error('Pexels returned an unexpected response shape');
	}

	return {
		photos: value.photos.flatMap((result) => {
			const photo = parsePexelsPhoto(result);
			return photo ? [photo] : [];
		}),
		page: getPositiveInteger(value.page),
		perPage: getPositiveInteger(value.per_page),
		totalResults: getPositiveInteger(value.total_results),
		nextPage: getNonEmptyString(value, 'next_page')
	};
}

function getSearchQuery(request: ProviderSearchRequest): string {
	const query = request.query?.trim();

	if (query === undefined || query.length === 0) {
		throw new Error('Pexels search requires a generated query');
	}

	return query;
}

function buildPexelsSearchUrl(config: PexelsProviderConfig, request: ProviderSearchRequest): URL {
	const apiBaseUrl = config.apiBaseUrl.replace(/\/$/, '');
	const url = new URL(`${apiBaseUrl}/search`);

	url.searchParams.set('query', getSearchQuery(request));
	url.searchParams.set('per_page', String(request.count));
	url.searchParams.set('page', normalizePageCursor(request.cursor));

	if (request.orientation !== undefined && request.orientation !== 'any') {
		url.searchParams.set('orientation', request.orientation);
	}

	return url;
}

function makeAttributionLabel(photo: PexelsPhoto): string {
	return photo.photographer ? `Photo by ${photo.photographer} on Pexels` : 'Photo from Pexels';
}

function makeTitle(photo: PexelsPhoto): string {
	if (photo.alt !== undefined) {
		return photo.alt;
	}

	return photo.photographer ? `Pexels photo by ${photo.photographer}` : 'Pexels photo';
}

function makeAltText(photo: PexelsPhoto): string {
	return photo.alt ?? makeTitle(photo);
}

function toDrawingReference(photo: PexelsPhoto, request: ProviderSearchRequest): DrawingReference {
	const primarySubject = request.primarySubject;

	if (primarySubject === undefined) {
		throw new Error('Pexels search requires a planned reference subject');
	}

	const referenceImage: DrawingReference['image'] = {
		url: photo.imageUrl,
		alt: makeAltText(photo)
	};
	const attribution: DrawingReference['attribution'] = {
		label: makeAttributionLabel(photo),
		sourceName: pexelsProviderName,
		sourceUrl: photo.url,
		licenseName: pexelsLicenseName,
		licenseUrl: pexelsLicenseUrl
	};

	if (photo.width !== undefined) {
		referenceImage.width = photo.width;
	}

	if (photo.height !== undefined) {
		referenceImage.height = photo.height;
	}

	if (photo.photographer !== undefined) {
		attribution.creatorName = photo.photographer;
	}

	if (photo.photographerUrl !== undefined) {
		attribution.creatorUrl = photo.photographerUrl;
	}

	const taxonomy: DrawingReference['taxonomy'] = {
		primarySubject,
		secondarySubjects: request.secondarySubjects,
		sceneTypes: request.sceneTypes
	};
	const training: DrawingReference['training'] = {
		focuses: request.practiceFocuses,
		complexity: request.complexity
	};

	if (request.topic !== undefined) {
		taxonomy.topic = request.topic;
	}

	return {
		id: `${pexelsProviderId}:${photo.id}`,
		provider: {
			id: pexelsProviderId,
			name: pexelsProviderName,
			referenceId: photo.id
		},
		title: makeTitle(photo),
		taxonomy,
		training,
		selection: request.seedId === undefined ? undefined : { seedId: request.seedId },
		image: referenceImage,
		attribution
	};
}

function getNextCursor(response: PexelsSearchResponse): string | undefined {
	const explicitNextPage = parseNextPageCursor(response.nextPage);

	if (explicitNextPage !== undefined) {
		return explicitNextPage;
	}

	if (
		response.page !== undefined &&
		response.perPage !== undefined &&
		response.totalResults !== undefined &&
		response.page * response.perPage < response.totalResults
	) {
		return String(response.page + 1);
	}

	return undefined;
}

async function searchPexels(
	config: PexelsProviderConfig,
	fetchFunction: FetchFunction,
	request: ProviderSearchRequest
): Promise<ProviderSearchResult> {
	if (request.primarySubject === undefined) {
		throw new Error('Pexels search requires a planned reference subject');
	}

	const response = await fetchFunction(buildPexelsSearchUrl(config, request), {
		headers: {
			Accept: 'application/json',
			Authorization: config.apiKey
		}
	});

	if (!response.ok) {
		throw new ReferenceProviderHttpError(`Pexels search failed with status ${response.status}`, {
			status: response.status,
			retryAfterSeconds: parseRetryAfterSeconds(response.headers.get('retry-after'))
		});
	}

	const body: unknown = await response.json();
	const parsedResponse = parsePexelsSearchResponse(body);

	return {
		references: parsedResponse.photos.map((photo) => toDrawingReference(photo, request)),
		nextCursor: getNextCursor(parsedResponse),
		cachePolicy: {
			metadataTtlSeconds: pexelsMetadataTtlSeconds,
			canCacheImageBytes: false
		}
	};
}

export function createPexelsReferenceProvider(
	options: PexelsReferenceProviderOptions
): ReferenceProvider {
	const fetchFunction = options.fetch ?? fetch;

	return {
		id: pexelsProviderId,
		name: pexelsProviderName,
		capabilities: {
			subjects: referenceSubjects,
			supportsSearch: true,
			supportsPagination: true,
			supportsOrientation: true,
			attributionRequired: true
		},
		search(request) {
			return searchPexels(options, fetchFunction, request);
		}
	} satisfies ReferenceProvider;
}

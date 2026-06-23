import {
	referenceCategories,
	type DrawingReference,
	type ReferenceCategory
} from '$lib/references';
import type { ProviderSearchRequest, ProviderSearchResult, ReferenceProvider } from '../provider';

const localProviderId = 'local';
const localProviderName = 'DrawThis local references';
const localMockCredit = 'DrawThis local mock reference';

interface LocalReferenceCatalogItem {
	id: string;
	title: string;
	category: ReferenceCategory;
	imageUrl: string;
	alt: string;
}

const localReferenceCatalog = [
	{
		id: 'room-interior',
		title: 'Room Interior',
		category: 'interior',
		imageUrl: '/references/room-interior.svg',
		alt: 'Line drawing of a room corner with a table, chair, window, lamp, and framed picture.'
	},
	{
		id: 'street-corner',
		title: 'Street Corner',
		category: 'street',
		imageUrl: '/references/street-corner.svg',
		alt: 'Line drawing of a city street corner with buildings, sidewalk, crosswalk, and a parked car.'
	},
	{
		id: 'hand-study',
		title: 'Hand Study',
		category: 'figure-study',
		imageUrl: '/references/hand-study.svg',
		alt: 'Line drawing of an open hand with separated fingers and palm construction lines.'
	},
	{
		id: 'still-life',
		title: 'Still Life',
		category: 'still-life',
		imageUrl: '/references/still-life.svg',
		alt: 'Line drawing of a mug, bottle, apple, folded cloth, and spoon on a table.'
	},
	{
		id: 'plant-window',
		title: 'Plant By Window',
		category: 'plant',
		imageUrl: '/references/plant-window.svg',
		alt: 'Line drawing of a potted plant on a low table in front of a window with curtains.'
	}
] satisfies readonly LocalReferenceCatalogItem[];

function toDrawingReference(item: LocalReferenceCatalogItem): DrawingReference {
	return {
		id: `${localProviderId}:${item.id}`,
		provider: {
			id: localProviderId,
			name: localProviderName,
			referenceId: item.id
		},
		title: item.title,
		category: item.category,
		image: {
			url: item.imageUrl,
			alt: item.alt
		},
		attribution: {
			label: localMockCredit,
			sourceUrl: item.imageUrl
		}
	};
}

export const localReferenceProvider = {
	id: localProviderId,
	name: localProviderName,
	capabilities: {
		categories: referenceCategories,
		supportsSearch: false,
		supportsPagination: false,
		supportsOrientation: false,
		attributionRequired: false
	},
	async search(request: ProviderSearchRequest): Promise<ProviderSearchResult> {
		const categoryMatches = request.category
			? localReferenceCatalog.filter((reference) => reference.category === request.category)
			: localReferenceCatalog;

		return {
			references: categoryMatches.slice(0, request.count).map(toDrawingReference),
			cachePolicy: {
				metadataTtlSeconds: 86_400,
				canCacheImageBytes: true
			}
		};
	}
} satisfies ReferenceProvider;

export const localReferenceCount = localReferenceCatalog.length;

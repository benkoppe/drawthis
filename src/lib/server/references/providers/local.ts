import {
	referenceSubjects,
	type DrawingReference,
	type ReferencePracticeFocus,
	type ReferenceSceneType,
	type ReferenceSubjectId,
	type ReferenceTopicId,
	type ReferenceVisualComplexity
} from '$lib/references';
import type { ProviderSearchRequest, ProviderSearchResult, ReferenceProvider } from '../provider';

const localProviderId = 'local';
const localProviderName = 'DrawThis local references';
const localSourceName = 'DrawThis';
const localMockCredit = 'DrawThis local mock reference';

interface LocalReferenceCatalogItem {
	id: string;
	title: string;
	primarySubject: ReferenceSubjectId;
	topic?: ReferenceTopicId;
	sceneTypes?: readonly ReferenceSceneType[];
	practiceFocuses?: readonly ReferencePracticeFocus[];
	complexity?: ReferenceVisualComplexity;
	imageUrl: string;
	alt: string;
}

const localReferenceCatalog = [
	{
		id: 'room-interior',
		title: 'Room Interior',
		primarySubject: 'places',
		topic: 'rooms',
		sceneTypes: ['interior', 'everyday-life'],
		practiceFocuses: ['perspective', 'composition'],
		complexity: 'complex',
		imageUrl: '/references/room-interior.svg',
		alt: 'Line drawing of a room corner with a table, chair, window, lamp, and framed picture.'
	},
	{
		id: 'street-corner',
		title: 'Street Corner',
		primarySubject: 'places',
		topic: 'streets-sidewalks',
		sceneTypes: ['street', 'public-space', 'everyday-life'],
		practiceFocuses: ['perspective', 'composition'],
		complexity: 'complex',
		imageUrl: '/references/street-corner.svg',
		alt: 'Line drawing of a city street corner with buildings, sidewalk, crosswalk, and a parked car.'
	},
	{
		id: 'hand-study',
		title: 'Hand Study',
		primarySubject: 'people',
		topic: 'hands-feet',
		sceneTypes: ['close-up'],
		practiceFocuses: ['construction', 'anatomy', 'shape'],
		complexity: 'moderate',
		imageUrl: '/references/hand-study.svg',
		alt: 'Line drawing of an open hand with separated fingers and palm construction lines.'
	},
	{
		id: 'still-life',
		title: 'Still Life',
		primarySubject: 'objects',
		topic: 'still-life-groups',
		sceneTypes: ['still-life'],
		practiceFocuses: ['construction', 'shape', 'value'],
		complexity: 'moderate',
		imageUrl: '/references/still-life.svg',
		alt: 'Line drawing of a mug, bottle, apple, folded cloth, and spoon on a table.'
	},
	{
		id: 'plant-window',
		title: 'Plant By Window',
		primarySubject: 'nature',
		topic: 'plants-flowers',
		sceneTypes: ['interior', 'isolated-subject'],
		practiceFocuses: ['shape', 'texture', 'negative-space'],
		complexity: 'moderate',
		imageUrl: '/references/plant-window.svg',
		alt: 'Line drawing of a potted plant on a low table in front of a window with curtains.'
	}
] satisfies readonly LocalReferenceCatalogItem[];

function toDrawingReference(
	item: LocalReferenceCatalogItem,
	request: ProviderSearchRequest
): DrawingReference {
	const taxonomy: DrawingReference['taxonomy'] = {
		primarySubject: item.primarySubject,
		sceneTypes: item.sceneTypes
	};
	const training: DrawingReference['training'] = {
		focuses: item.practiceFocuses,
		complexity: item.complexity
	};

	if (item.topic !== undefined) {
		taxonomy.topic = item.topic;
	}

	return {
		id: `${localProviderId}:${item.id}`,
		provider: {
			id: localProviderId,
			name: localProviderName,
			referenceId: item.id
		},
		title: item.title,
		taxonomy,
		training,
		selection: request.seedId === undefined ? undefined : { seedId: request.seedId },
		image: {
			url: item.imageUrl,
			alt: item.alt
		},
		attribution: {
			label: localMockCredit,
			sourceName: localSourceName,
			sourceUrl: item.imageUrl
		}
	};
}

export const localReferenceProvider = {
	id: localProviderId,
	name: localProviderName,
	capabilities: {
		subjects: referenceSubjects,
		supportsSearch: false,
		supportsPagination: false,
		supportsOrientation: false,
		attributionRequired: false
	},
	async search(request: ProviderSearchRequest): Promise<ProviderSearchResult> {
		const subjectMatches = request.primarySubject
			? localReferenceCatalog.filter(
					(reference) => reference.primarySubject === request.primarySubject
				)
			: localReferenceCatalog;

		return {
			references: subjectMatches
				.slice(0, request.count)
				.map((item) => toDrawingReference(item, request)),
			cachePolicy: {
				metadataTtlSeconds: 86_400,
				canCacheImageBytes: true
			}
		};
	}
} satisfies ReferenceProvider;

export const localReferenceCount = localReferenceCatalog.length;

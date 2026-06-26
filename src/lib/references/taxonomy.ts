export const referenceSubjects = [
	'people',
	'animals',
	'objects',
	'places',
	'nature',
	'vehicles-machines'
] as const;

export type ReferenceSubjectId = (typeof referenceSubjects)[number];

export const referenceSubjectLabels = {
	people: 'People',
	animals: 'Animals',
	objects: 'Objects',
	places: 'Places',
	nature: 'Nature',
	'vehicles-machines': 'Vehicles & Machines'
} satisfies Record<ReferenceSubjectId, string>;

export const referenceTopicsBySubject = {
	people: [
		'gesture-action',
		'full-figure',
		'portrait-head',
		'expression',
		'hands-feet',
		'clothing-drapery',
		'groups-crowds'
	],
	animals: [
		'pets',
		'wildlife',
		'birds',
		'insects-small-animals',
		'animal-heads',
		'paws-details',
		'motion-poses'
	],
	objects: [
		'household-objects',
		'still-life-groups',
		'tools',
		'food',
		'fabric-clothing',
		'books-electronics',
		'containers',
		'clutter'
	],
	places: [
		'rooms',
		'kitchens-workspaces',
		'public-interiors',
		'streets-sidewalks',
		'storefronts',
		'transit-stops',
		'parking-lots',
		'stairs-corridors',
		'architecture-facades'
	],
	nature: [
		'plants-flowers',
		'trees-branches',
		'rocks-ground',
		'water-coast',
		'sky-clouds',
		'gardens-parks',
		'landscapes'
	],
	'vehicles-machines': [
		'cars-trucks',
		'bikes-motorcycles',
		'buses-trains',
		'boats-aircraft',
		'construction-machinery',
		'mechanical-details'
	]
} as const satisfies Record<ReferenceSubjectId, readonly string[]>;

export type ReferenceTopicId = (typeof referenceTopicsBySubject)[ReferenceSubjectId][number];

export const referenceTopicLabels = {
	'gesture-action': 'Gesture / Action',
	'full-figure': 'Full Figure',
	'portrait-head': 'Portrait / Head',
	expression: 'Expression',
	'hands-feet': 'Hands / Feet',
	'clothing-drapery': 'Clothing / Drapery',
	'groups-crowds': 'Groups / Crowds',
	pets: 'Pets',
	wildlife: 'Wildlife',
	birds: 'Birds',
	'insects-small-animals': 'Insects / Small Animals',
	'animal-heads': 'Animal Heads',
	'paws-details': 'Paws / Details',
	'motion-poses': 'Motion Poses',
	'household-objects': 'Household Objects',
	'still-life-groups': 'Still Life Groups',
	tools: 'Tools',
	food: 'Food',
	'fabric-clothing': 'Fabric / Clothing',
	'books-electronics': 'Books / Electronics',
	containers: 'Containers',
	clutter: 'Clutter',
	rooms: 'Rooms',
	'kitchens-workspaces': 'Kitchens / Workspaces',
	'public-interiors': 'Public Interiors',
	'streets-sidewalks': 'Streets / Sidewalks',
	storefronts: 'Storefronts',
	'transit-stops': 'Transit Stops',
	'parking-lots': 'Parking Lots',
	'stairs-corridors': 'Stairs / Corridors',
	'architecture-facades': 'Architecture / Facades',
	'plants-flowers': 'Plants / Flowers',
	'trees-branches': 'Trees / Branches',
	'rocks-ground': 'Rocks / Ground',
	'water-coast': 'Water / Coast',
	'sky-clouds': 'Sky / Clouds',
	'gardens-parks': 'Gardens / Parks',
	landscapes: 'Landscapes',
	'cars-trucks': 'Cars / Trucks',
	'bikes-motorcycles': 'Bikes / Motorcycles',
	'buses-trains': 'Buses / Trains',
	'boats-aircraft': 'Boats / Aircraft',
	'construction-machinery': 'Construction Machinery',
	'mechanical-details': 'Mechanical Details'
} satisfies Record<ReferenceTopicId, string>;

export const referenceTopics = referenceSubjects.flatMap((subject) => [
	...referenceTopicsBySubject[subject]
]) as ReferenceTopicId[];

export const referenceTopicSubjects = Object.fromEntries(
	referenceSubjects.flatMap((subject) =>
		referenceTopicsBySubject[subject].map((topic) => [topic, subject])
	)
) as Record<ReferenceTopicId, ReferenceSubjectId>;

export const referencePracticeFocuses = [
	'gesture',
	'proportion',
	'perspective',
	'construction',
	'shape',
	'value',
	'light-shadow',
	'texture',
	'material',
	'composition',
	'anatomy',
	'negative-space'
] as const;

export type ReferencePracticeFocus = (typeof referencePracticeFocuses)[number];

export const referenceSceneTypes = [
	'isolated-subject',
	'still-life',
	'interior',
	'street',
	'landscape',
	'everyday-life',
	'public-space',
	'workplace',
	'close-up'
] as const;

export type ReferenceSceneType = (typeof referenceSceneTypes)[number];

export const referenceVisualComplexities = ['simple', 'moderate', 'complex', 'dense'] as const;

export type ReferenceVisualComplexity = (typeof referenceVisualComplexities)[number];

export interface ReferenceCategoryFilterSelection {
	enabledSubjects: ReferenceSubjectId[];
	enabledTopics: ReferenceTopicId[];
}

export const referenceCategoryFilterStorageKey = 'drawthis:reference-category-filter:v2';

export function isReferenceSubject(value: unknown): value is ReferenceSubjectId {
	return typeof value === 'string' && referenceSubjects.includes(value as ReferenceSubjectId);
}

export function isReferenceTopic(value: unknown): value is ReferenceTopicId {
	return typeof value === 'string' && referenceTopics.includes(value as ReferenceTopicId);
}

export function isReferencePracticeFocus(value: unknown): value is ReferencePracticeFocus {
	return (
		typeof value === 'string' && referencePracticeFocuses.includes(value as ReferencePracticeFocus)
	);
}

export function isReferenceSceneType(value: unknown): value is ReferenceSceneType {
	return typeof value === 'string' && referenceSceneTypes.includes(value as ReferenceSceneType);
}

export function isReferenceVisualComplexity(value: unknown): value is ReferenceVisualComplexity {
	return (
		typeof value === 'string' &&
		referenceVisualComplexities.includes(value as ReferenceVisualComplexity)
	);
}

export function normalizeReferenceSubjects(
	subjects: readonly ReferenceSubjectId[]
): ReferenceSubjectId[] {
	const selectedSubjects = new Set(subjects);

	return referenceSubjects.filter((subject) => selectedSubjects.has(subject));
}

export function normalizeReferenceTopics(
	topics: readonly ReferenceTopicId[],
	subjects: readonly ReferenceSubjectId[] = referenceSubjects
): ReferenceTopicId[] {
	const selectedTopics = new Set(topics);
	const selectedSubjects = new Set(subjects);

	return referenceTopics.filter(
		(topic) => selectedTopics.has(topic) && selectedSubjects.has(referenceTopicSubjects[topic])
	);
}

export function getReferenceSubjectTopics(subject: ReferenceSubjectId): ReferenceTopicId[] {
	return [...referenceTopicsBySubject[subject]];
}

export function getReferenceTopicSubject(topic: ReferenceTopicId): ReferenceSubjectId {
	return referenceTopicSubjects[topic];
}

export function normalizeReferencePracticeFocuses(
	focuses: readonly ReferencePracticeFocus[] | undefined
): ReferencePracticeFocus[] | undefined {
	if (focuses === undefined) {
		return undefined;
	}

	const selectedFocuses = new Set(focuses);
	const normalized = referencePracticeFocuses.filter((focus) => selectedFocuses.has(focus));

	return normalized.length > 0 ? normalized : undefined;
}

export function normalizeReferenceSceneTypes(
	sceneTypes: readonly ReferenceSceneType[] | undefined
): ReferenceSceneType[] | undefined {
	if (sceneTypes === undefined) {
		return undefined;
	}

	const selectedSceneTypes = new Set(sceneTypes);
	const normalized = referenceSceneTypes.filter((sceneType) => selectedSceneTypes.has(sceneType));

	return normalized.length > 0 ? normalized : undefined;
}

export function getReferenceSubjectSelectionKey(subjects: readonly ReferenceSubjectId[]): string {
	return normalizeReferenceSubjects(subjects).join('\0');
}

export function getReferenceTopicSelectionKey(
	topics: readonly ReferenceTopicId[],
	subjects: readonly ReferenceSubjectId[] = referenceSubjects
): string {
	return normalizeReferenceTopics(topics, subjects).join('\0');
}

export function areReferenceSubjectSelectionsEqual(
	left: readonly ReferenceSubjectId[],
	right: readonly ReferenceSubjectId[]
): boolean {
	return getReferenceSubjectSelectionKey(left) === getReferenceSubjectSelectionKey(right);
}

export function areReferenceTopicSelectionsEqual(
	left: readonly ReferenceTopicId[],
	right: readonly ReferenceTopicId[],
	subjects: readonly ReferenceSubjectId[] = referenceSubjects
): boolean {
	return (
		getReferenceTopicSelectionKey(left, subjects) === getReferenceTopicSelectionKey(right, subjects)
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function createReferenceCategoryFilterSelection(
	enabledSubjects: readonly ReferenceSubjectId[] = referenceSubjects,
	enabledTopics: readonly ReferenceTopicId[] = referenceTopics
): ReferenceCategoryFilterSelection {
	const normalizedSubjects = normalizeReferenceSubjects(enabledSubjects);
	const normalizedTopics = normalizeReferenceTopics(enabledTopics, normalizedSubjects);

	return { enabledSubjects: normalizedSubjects, enabledTopics: normalizedTopics };
}

export function parseReferenceCategoryFilterSelection(
	value: string | null | undefined
): ReferenceCategoryFilterSelection | undefined {
	if (value === null || value === undefined || value.length === 0) {
		return undefined;
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(value);
	} catch {
		return undefined;
	}

	if (!isRecord(parsed) || parsed.version !== 1) {
		return undefined;
	}

	if (!Array.isArray(parsed.subjects) || !Array.isArray(parsed.topics)) {
		return undefined;
	}

	return createReferenceCategoryFilterSelection(
		parsed.subjects.filter(isReferenceSubject),
		parsed.topics.filter(isReferenceTopic)
	);
}

export function serializeReferenceCategoryFilterSelection(
	selection: ReferenceCategoryFilterSelection
): string {
	const normalizedSelection = createReferenceCategoryFilterSelection(
		selection.enabledSubjects,
		selection.enabledTopics
	);

	return JSON.stringify({
		version: 1,
		subjects: normalizedSelection.enabledSubjects,
		topics: normalizedSelection.enabledTopics
	});
}

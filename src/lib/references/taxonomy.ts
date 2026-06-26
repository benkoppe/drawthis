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

export const referencePracticeMixModes = [
	'balanced',
	'people',
	'places-perspective',
	'objects-forms',
	'living-things',
	'quick-warmup',
	'value-texture',
	'custom'
] as const;

export type ReferencePracticeMixMode = (typeof referencePracticeMixModes)[number];

export interface ReferencePracticeMixPreset {
	mode: Exclude<ReferencePracticeMixMode, 'custom'>;
	label: string;
	description: string;
	enabledSubjects: readonly ReferenceSubjectId[];
}

export const referencePracticeMixPresets = [
	{
		mode: 'balanced',
		label: 'Balanced practice',
		description: 'Broad subject variety for general drawing practice.',
		enabledSubjects: referenceSubjects
	},
	{
		mode: 'people',
		label: 'People',
		description: 'Figures, portraits, hands, clothing, and groups.',
		enabledSubjects: ['people']
	},
	{
		mode: 'places-perspective',
		label: 'Places & perspective',
		description: 'Rooms, streets, architecture, transit, and vehicles.',
		enabledSubjects: ['places', 'vehicles-machines']
	},
	{
		mode: 'objects-forms',
		label: 'Objects & forms',
		description: 'Still life, tools, food, fabric, machines, and simple forms.',
		enabledSubjects: ['objects', 'vehicles-machines']
	},
	{
		mode: 'living-things',
		label: 'Living things',
		description: 'People, animals, plants, and organic forms.',
		enabledSubjects: ['people', 'animals', 'nature']
	},
	{
		mode: 'quick-warmup',
		label: 'Quick warmup',
		description: 'Gesture-friendly, readable subjects for short repetitions.',
		enabledSubjects: referenceSubjects
	},
	{
		mode: 'value-texture',
		label: 'Value & texture',
		description: 'Light, shadow, material, texture, foliage, fabric, and clutter.',
		enabledSubjects: referenceSubjects
	}
] as const satisfies readonly ReferencePracticeMixPreset[];

export const referencePracticeMixLabels = Object.fromEntries(
	referencePracticeMixPresets.map((preset) => [preset.mode, preset.label])
) as Record<Exclude<ReferencePracticeMixMode, 'custom'>, string>;

export interface ReferencePracticeMixSelection {
	mode: ReferencePracticeMixMode;
	enabledSubjects: ReferenceSubjectId[];
}

export const referencePracticeMixStorageKey = 'drawthis:reference-practice-mix';

export function isReferenceSubject(value: unknown): value is ReferenceSubjectId {
	return typeof value === 'string' && referenceSubjects.includes(value as ReferenceSubjectId);
}

export function isReferenceTopic(value: unknown): value is ReferenceTopicId {
	return (
		typeof value === 'string' &&
		Object.values(referenceTopicsBySubject).some((topics) => topics.includes(value as never))
	);
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

export function isReferencePracticeMixMode(value: unknown): value is ReferencePracticeMixMode {
	return (
		typeof value === 'string' &&
		referencePracticeMixModes.includes(value as ReferencePracticeMixMode)
	);
}

export function getReferencePracticeMixPreset(
	mode: ReferencePracticeMixMode
): ReferencePracticeMixPreset | undefined {
	return mode === 'custom'
		? undefined
		: referencePracticeMixPresets.find((preset) => preset.mode === mode);
}

export function normalizeReferenceSubjects(
	subjects: readonly ReferenceSubjectId[]
): ReferenceSubjectId[] {
	const selectedSubjects = new Set(subjects);

	return referenceSubjects.filter((subject) => selectedSubjects.has(subject));
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

export function areReferenceSubjectSelectionsEqual(
	left: readonly ReferenceSubjectId[],
	right: readonly ReferenceSubjectId[]
): boolean {
	return getReferenceSubjectSelectionKey(left) === getReferenceSubjectSelectionKey(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function createReferencePracticeMixSelection(
	mode: ReferencePracticeMixMode,
	enabledSubjects: readonly ReferenceSubjectId[] = []
): ReferencePracticeMixSelection {
	const preset = getReferencePracticeMixPreset(mode);

	if (preset !== undefined) {
		return { mode, enabledSubjects: [...preset.enabledSubjects] };
	}

	return { mode: 'custom', enabledSubjects: normalizeReferenceSubjects(enabledSubjects) };
}

export function parseReferencePracticeMixSelection(
	value: string | null | undefined
): ReferencePracticeMixSelection | undefined {
	if (value === null || value === undefined || value.length === 0) {
		return undefined;
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(value);
	} catch {
		return undefined;
	}

	if (!isRecord(parsed) || parsed.version !== 1 || !isReferencePracticeMixMode(parsed.mode)) {
		return undefined;
	}

	if (parsed.mode !== 'custom') {
		return createReferencePracticeMixSelection(parsed.mode);
	}

	if (!Array.isArray(parsed.subjects)) {
		return undefined;
	}

	return createReferencePracticeMixSelection('custom', parsed.subjects.filter(isReferenceSubject));
}

export function serializeReferencePracticeMixSelection(
	selection: ReferencePracticeMixSelection
): string {
	if (selection.mode !== 'custom') {
		return JSON.stringify({ version: 1, mode: selection.mode });
	}

	return JSON.stringify({
		version: 1,
		mode: 'custom',
		subjects: normalizeReferenceSubjects(selection.enabledSubjects)
	});
}

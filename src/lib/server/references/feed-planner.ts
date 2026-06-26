import {
	isReferenceSubject,
	isReferenceTopic,
	normalizeReferenceSubjects,
	normalizeReferenceTopics,
	referenceSubjects,
	referenceTopics,
	type ReferenceFeedContextItem,
	type ReferenceFeedRequest,
	type ReferencePracticeFocus,
	type ReferenceSceneType,
	type ReferenceSeedMetadata,
	type ReferenceSubjectId,
	type ReferenceTopicId,
	type ReferenceVisualComplexity
} from '$lib/references';
import type { ProviderSearchRequest, ReferenceProvider } from './provider';
import {
	defaultReferenceFeedPolicy,
	type ReferenceFeedPolicy,
	type ReferenceProviderPaginationPolicy,
	type ReferenceSearchSeed
} from './feed-policy';

export interface PlannedProviderSearch {
	provider: ReferenceProvider;
	seed: ReferenceSearchSeed;
	request: ProviderSearchRequest;
}

export interface ReferenceFeedPlan {
	searches: readonly PlannedProviderSearch[];
}

export interface CreateReferenceFeedPlanOptions {
	providers: readonly ReferenceProvider[];
	searchCount: number;
	policy?: ReferenceFeedPolicy;
	random?: () => number;
}

interface WeightedItem<T> {
	item: T;
	weight: number;
}

interface TopicSeedGroup {
	subject: ReferenceSubjectId;
	topic?: ReferenceTopicId;
	seeds: ReferenceSearchSeed[];
}

interface SubjectSeedGroup {
	subject: ReferenceSubjectId;
	topics: TopicSeedGroup[];
}

interface ScoredItem<T> {
	item: T;
	score: number;
	order: number;
}

const defaultWeight = 1;
const planningContextWindowSize = 12;
const samePreviousSubjectPenalty = 1_000;
const recentSubjectUnitPenalty = 100;
const samePreviousTopicPenalty = 450;
const recentTopicUnitPenalty = 80;
const samePreviousSeedPenalty = 350;
const recentSeedUnitPenalty = 125;
const recentSceneTypeUnitPenalty = 20;
const recentPracticeFocusUnitPenalty = 12;
const recentComplexityUnitPenalty = 8;

function normalizeWeight(weight: number | undefined): number {
	if (weight === undefined) {
		return defaultWeight;
	}

	return weight > 0 ? weight : 0;
}

function weightedShuffle<T>(items: readonly WeightedItem<T>[], random: () => number): T[] {
	const remaining = items.filter(({ weight }) => weight > 0);
	const shuffled: T[] = [];

	while (remaining.length > 0) {
		const totalWeight = remaining.reduce((total, { weight }) => total + weight, 0);
		let target = random() * totalWeight;
		let selectedIndex = remaining.length - 1;

		for (let index = 0; index < remaining.length; index += 1) {
			target -= remaining[index].weight;

			if (target < 0) {
				selectedIndex = index;
				break;
			}
		}

		const [selected] = remaining.splice(selectedIndex, 1);
		shuffled.push(selected.item);
	}

	return shuffled;
}

function orderByScore<T>(
	items: readonly T[],
	getScore: (item: T) => number,
	getWeight: (item: T) => number | undefined,
	random: () => number
): T[] {
	return weightedShuffle(
		items.map((item) => ({ item, weight: normalizeWeight(getWeight(item)) })),
		random
	)
		.map((item, order): ScoredItem<T> => ({ item, order, score: getScore(item) }))
		.sort((left, right) => left.score - right.score || left.order - right.order)
		.map(({ item }) => item);
}

function getEnabledSubjects(request: ReferenceFeedRequest): ReferenceSubjectId[] | undefined {
	const enabledSubjects = request.preferences?.enabledSubjects;

	if (enabledSubjects === undefined) {
		return undefined;
	}

	if (enabledSubjects.length === 0) {
		throw new Error('enabledSubjects must include at least one subject');
	}

	for (const subject of enabledSubjects) {
		if (!isReferenceSubject(subject)) {
			throw new Error('enabledSubjects contains an unsupported subject');
		}
	}

	return normalizeReferenceSubjects(enabledSubjects);
}

function getEnabledTopics(
	request: ReferenceFeedRequest,
	enabledSubjects: readonly ReferenceSubjectId[]
): ReferenceTopicId[] | undefined {
	const enabledTopics = request.preferences?.enabledTopics;

	if (enabledTopics === undefined) {
		return undefined;
	}

	if (enabledTopics.length === 0) {
		throw new Error('enabledTopics must include at least one topic');
	}

	for (const topic of enabledTopics) {
		if (!isReferenceTopic(topic)) {
			throw new Error('enabledTopics contains an unsupported topic');
		}
	}

	const normalizedTopics = normalizeReferenceTopics(enabledTopics, enabledSubjects);

	if (normalizedTopics.length === 0) {
		throw new Error('enabledTopics must include at least one topic for an enabled subject');
	}

	return normalizedTopics;
}

function getRandomInitialCursorPage(
	policy: ReferenceProviderPaginationPolicy | undefined,
	random: () => number
): string | undefined {
	if (policy === undefined) {
		return undefined;
	}

	const min = Math.ceil(policy.initialCursorPageMin);
	const max = Math.floor(policy.initialCursorPageMax);

	if (min < 1 || max < min) {
		return undefined;
	}

	const randomValue = Math.min(Math.max(random(), 0), 1 - Number.EPSILON);

	return String(Math.floor(randomValue * (max - min + 1)) + min);
}

function makeSeedMetadata(seed: ReferenceSearchSeed): ReferenceSeedMetadata {
	return {
		id: seed.id,
		label: seed.label,
		query: seed.query
	};
}

function makeProviderSearchRequest(
	provider: ReferenceProvider,
	seed: ReferenceSearchSeed,
	count: number,
	policy: ReferenceFeedPolicy,
	random: () => number
): ProviderSearchRequest {
	const request: ProviderSearchRequest = {
		count,
		primarySubject: seed.primarySubject,
		seed: makeSeedMetadata(seed)
	};

	if (seed.topic !== undefined) {
		request.topic = seed.topic;
	}

	if (seed.secondarySubjects !== undefined) {
		request.secondarySubjects = seed.secondarySubjects;
	}

	if (seed.sceneTypes !== undefined) {
		request.sceneTypes = seed.sceneTypes;
	}

	if (seed.focuses !== undefined) {
		request.focuses = seed.focuses;
	}

	if (seed.complexity !== undefined) {
		request.complexity = seed.complexity;
	}

	if (provider.capabilities.supportsSearch) {
		request.query = seed.query;
	}

	if (provider.capabilities.supportsOrientation && seed.orientation !== undefined) {
		request.orientation = seed.orientation;
	}

	if (provider.capabilities.supportsPagination) {
		const cursor = getRandomInitialCursorPage(policy.providerPagination?.[provider.id], random);

		if (cursor !== undefined) {
			request.cursor = cursor;
		}
	}

	return request;
}

function makeSearchKey(provider: ReferenceProvider, request: ProviderSearchRequest): string {
	return [
		provider.id,
		request.primarySubject ?? '',
		request.topic ?? '',
		request.query ?? '',
		request.orientation ?? '',
		request.cursor ?? ''
	].join('\u0000');
}

function providerSupportsSubject(
	provider: ReferenceProvider,
	subject: ReferenceSubjectId
): boolean {
	return provider.capabilities.subjects.includes(subject);
}

function orderCompatibleProviders(
	providers: readonly ReferenceProvider[],
	policy: ReferenceFeedPolicy,
	random: () => number
): ReferenceProvider[] {
	if (policy.providerWeights === undefined) {
		return [...providers];
	}

	return weightedShuffle(
		providers.map((provider) => ({
			item: provider,
			weight: normalizeWeight(policy.providerWeights?.[provider.id])
		})),
		random
	);
}

function getPlanningContext(request: ReferenceFeedRequest): ReferenceFeedContextItem[] {
	return [...(request.recentReferences ?? []), ...(request.precedingReferences ?? [])].slice(
		-planningContextWindowSize
	);
}

function getRecentContext(
	context: readonly ReferenceFeedContextItem[]
): readonly ReferenceFeedContextItem[] {
	return context.slice(-planningContextWindowSize);
}

function getPreviousContextItem(
	context: readonly ReferenceFeedContextItem[]
): ReferenceFeedContextItem | undefined {
	return context.at(-1);
}

function countRecentSubjects(
	subject: ReferenceSubjectId,
	context: readonly ReferenceFeedContextItem[]
): number {
	return getRecentContext(context).reduce(
		(count, reference) => count + (reference.taxonomy.primarySubject === subject ? 1 : 0),
		0
	);
}

function countRecentTopics(
	topic: ReferenceTopicId | undefined,
	context: readonly ReferenceFeedContextItem[]
): number {
	if (topic === undefined) {
		return 0;
	}

	return getRecentContext(context).reduce(
		(count, reference) => count + (reference.taxonomy.topic === topic ? 1 : 0),
		0
	);
}

function countRecentSeeds(seedId: string, context: readonly ReferenceFeedContextItem[]): number {
	return getRecentContext(context).reduce(
		(count, reference) => count + (reference.selection?.seedId === seedId ? 1 : 0),
		0
	);
}

function countRecentOverlap<T>(
	values: readonly T[] | undefined,
	context: readonly ReferenceFeedContextItem[],
	getValues: (reference: ReferenceFeedContextItem) => readonly T[] | undefined
): number {
	if (values === undefined || values.length === 0) {
		return 0;
	}

	const valueSet = new Set(values);

	return getRecentContext(context).reduce((count, reference) => {
		const overlapCount = (getValues(reference) ?? []).filter((value) => valueSet.has(value)).length;

		return count + overlapCount;
	}, 0);
}

function countRecentComplexity(
	complexity: ReferenceVisualComplexity | undefined,
	context: readonly ReferenceFeedContextItem[]
): number {
	if (complexity === undefined) {
		return 0;
	}

	return getRecentContext(context).reduce(
		(count, reference) => count + (reference.training?.complexity === complexity ? 1 : 0),
		0
	);
}

function getSubjectPlanningScore(
	subject: ReferenceSubjectId,
	context: readonly ReferenceFeedContextItem[]
): number {
	const previousReference = getPreviousContextItem(context);

	return (
		(previousReference?.taxonomy.primarySubject === subject ? samePreviousSubjectPenalty : 0) +
		countRecentSubjects(subject, context) * recentSubjectUnitPenalty
	);
}

function getTopicPlanningScore(
	group: TopicSeedGroup,
	context: readonly ReferenceFeedContextItem[]
): number {
	const previousReference = getPreviousContextItem(context);

	return (
		(group.topic !== undefined && previousReference?.taxonomy.topic === group.topic
			? samePreviousTopicPenalty
			: 0) +
		countRecentTopics(group.topic, context) * recentTopicUnitPenalty
	);
}

function getSeedPlanningScore(
	seed: ReferenceSearchSeed,
	context: readonly ReferenceFeedContextItem[]
): number {
	const previousReference = getPreviousContextItem(context);
	const previousSeedId = previousReference?.selection?.seedId;

	return (
		(seed.id === previousSeedId ? samePreviousSeedPenalty : 0) +
		countRecentSeeds(seed.id, context) * recentSeedUnitPenalty +
		countRecentOverlap(
			seed.sceneTypes,
			context,
			(reference): readonly ReferenceSceneType[] | undefined => reference.training?.sceneTypes
		) *
			recentSceneTypeUnitPenalty +
		countRecentOverlap(
			seed.focuses,
			context,
			(reference): readonly ReferencePracticeFocus[] | undefined => reference.training?.focuses
		) *
			recentPracticeFocusUnitPenalty +
		countRecentComplexity(seed.complexity, context) * recentComplexityUnitPenalty
	);
}

function getTopicKey(topic: ReferenceTopicId | undefined): string {
	return topic ?? '';
}

function groupSeedsByBalancedTaxonomy(seeds: readonly ReferenceSearchSeed[]): SubjectSeedGroup[] {
	const groups = new Map<ReferenceSubjectId, Map<string, TopicSeedGroup>>();

	for (const seed of seeds) {
		let subjectGroup = groups.get(seed.primarySubject);

		if (subjectGroup === undefined) {
			subjectGroup = new Map<string, TopicSeedGroup>();
			groups.set(seed.primarySubject, subjectGroup);
		}

		const topicKey = getTopicKey(seed.topic);
		let topicGroup = subjectGroup.get(topicKey);

		if (topicGroup === undefined) {
			topicGroup = { subject: seed.primarySubject, topic: seed.topic, seeds: [] };
			subjectGroup.set(topicKey, topicGroup);
		}

		topicGroup.seeds.push(seed);
	}

	return referenceSubjects.flatMap((subject) => {
		const topicGroups = groups.get(subject);

		return topicGroups === undefined
			? []
			: [{ subject, topics: [...topicGroups.values()] } satisfies SubjectSeedGroup];
	});
}

function makeSubjectSeedQueue(
	group: SubjectSeedGroup,
	context: readonly ReferenceFeedContextItem[],
	random: () => number
): ReferenceSearchSeed[] {
	const topicQueues = orderByScore(
		group.topics,
		(topicGroup) => getTopicPlanningScore(topicGroup, context),
		() => 1,
		random
	).map((topicGroup) => ({
		...topicGroup,
		seeds: orderByScore(
			topicGroup.seeds,
			(seed) => getSeedPlanningScore(seed, context),
			(seed) => seed.weight,
			random
		)
	}));
	const queue: ReferenceSearchSeed[] = [];

	while (topicQueues.some((topicQueue) => topicQueue.seeds.length > 0)) {
		for (const topicQueue of topicQueues) {
			const seed = topicQueue.seeds.shift();

			if (seed !== undefined) {
				queue.push(seed);
			}
		}
	}

	return queue;
}

function orderSeedsByBalancedTaxonomy(
	seeds: readonly ReferenceSearchSeed[],
	context: readonly ReferenceFeedContextItem[],
	random: () => number
): ReferenceSearchSeed[] {
	const subjectGroups = orderByScore(
		groupSeedsByBalancedTaxonomy(seeds),
		(group) => getSubjectPlanningScore(group.subject, context),
		() => 1,
		random
	).map((subjectGroup) => ({
		subject: subjectGroup.subject,
		seeds: makeSubjectSeedQueue(subjectGroup, context, random)
	}));
	const seedsInBalancedOrder: ReferenceSearchSeed[] = [];

	while (subjectGroups.some((subjectGroup) => subjectGroup.seeds.length > 0)) {
		for (const subjectGroup of subjectGroups) {
			const seed = subjectGroup.seeds.shift();

			if (seed !== undefined) {
				seedsInBalancedOrder.push(seed);
			}
		}
	}

	return seedsInBalancedOrder;
}

export function createReferenceFeedPlan(
	request: ReferenceFeedRequest = {},
	options: CreateReferenceFeedPlanOptions
): ReferenceFeedPlan {
	const policy = options.policy ?? defaultReferenceFeedPolicy;
	const random = options.random ?? Math.random;
	const enabledSubjects = getEnabledSubjects(request) ?? referenceSubjects;
	const enabledTopics = getEnabledTopics(request, enabledSubjects) ?? referenceTopics;
	const enabledSubjectSet = new Set(enabledSubjects);
	const enabledTopicSet = new Set(enabledTopics);
	const selectedSearchKeys = new Set<string>();
	const searches: PlannedProviderSearch[] = [];
	const seeds = orderSeedsByBalancedTaxonomy(
		policy.seeds.filter(
			(seed) =>
				enabledSubjectSet.has(seed.primarySubject) &&
				(seed.topic === undefined || enabledTopicSet.has(seed.topic))
		),
		getPlanningContext(request),
		random
	);

	for (const seed of seeds) {
		const compatibleProviders = orderCompatibleProviders(
			options.providers.filter((provider) =>
				providerSupportsSubject(provider, seed.primarySubject)
			),
			policy,
			random
		);

		for (const provider of compatibleProviders) {
			const providerRequest = makeProviderSearchRequest(
				provider,
				seed,
				options.searchCount,
				policy,
				random
			);
			const searchKey = makeSearchKey(provider, providerRequest);

			if (selectedSearchKeys.has(searchKey)) {
				continue;
			}

			selectedSearchKeys.add(searchKey);
			searches.push({
				provider,
				seed,
				request: providerRequest
			});
		}
	}

	return { searches };
}

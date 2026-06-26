import {
	isReferenceSubject,
	isReferenceTopic,
	normalizeReferenceSubjects,
	normalizeReferenceTopics,
	referenceSubjects,
	referenceTopics,
	type ReferenceFeedRequest,
	type ReferenceSeedMetadata,
	type ReferenceSubjectId,
	type ReferenceTopicId
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

const defaultWeight = 1;

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

	if (seed.practiceFocuses !== undefined) {
		request.practiceFocuses = seed.practiceFocuses;
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

function groupSeedsBySubject(
	seeds: readonly ReferenceSearchSeed[],
	random: () => number
): ReferenceSearchSeed[][] {
	const groups = new Map<ReferenceSubjectId, ReferenceSearchSeed[]>();

	for (const seed of seeds) {
		const group = groups.get(seed.primarySubject) ?? [];
		group.push(seed);
		groups.set(seed.primarySubject, group);
	}

	return weightedShuffle(
		referenceSubjects.flatMap((subject) => {
			const seedsForSubject = groups.get(subject);

			if (seedsForSubject === undefined || seedsForSubject.length === 0) {
				return [];
			}

			const subjectWeight = seedsForSubject.reduce(
				(total, seed) => total + normalizeWeight(seed.weight),
				0
			);

			return [
				{
					item: weightedShuffle(
						seedsForSubject.map((seed) => ({
							item: seed,
							weight: normalizeWeight(seed.weight)
						})),
						random
					),
					weight: subjectWeight
				}
			];
		}),
		random
	);
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
	const seeds = policy.seeds.filter(
		(seed) =>
			enabledSubjectSet.has(seed.primarySubject) &&
			(seed.topic === undefined || enabledTopicSet.has(seed.topic))
	);
	const seedGroupsBySubject = groupSeedsBySubject(seeds, random).map((subjectSeeds) => {
		const subjectSearches: PlannedProviderSearch[] = [];

		for (const seed of subjectSeeds) {
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
				subjectSearches.push({
					provider,
					seed,
					request: providerRequest
				});
			}
		}

		return subjectSearches;
	});

	while (seedGroupsBySubject.some((subjectSearches) => subjectSearches.length > 0)) {
		for (const subjectSearches of seedGroupsBySubject) {
			const search = subjectSearches.shift();

			if (search !== undefined) {
				searches.push(search);
			}
		}
	}

	return { searches };
}

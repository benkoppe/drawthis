import {
	isReferenceSubject,
	isReferenceTopic,
	normalizeReferenceSubjects,
	normalizeReferenceTopics,
	referenceSubjects,
	referenceTopics,
	type ReferenceFeedRequest,
	type ReferenceSubjectId,
	type ReferenceTopicId
} from '$lib/references';
import { createReferencePlanningContext } from './feed-planning-context';
import { orderSeedsByBalancedTaxonomy } from './feed-seed-ordering';
import {
	defaultReferenceFeedPolicy,
	type ReferenceFeedPolicy,
	type ReferenceProviderPaginationPolicy,
	type ReferenceSeedWeightPolicy
} from './feed-policy';
import type { ProviderSearchRequest, ReferenceProvider } from './provider';
import { makeReferenceSeedMetadata, type ReferenceSearchSeed } from './reference-seed';
import { weightedShuffle } from './weighted-selection';

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
		seed: makeReferenceSeedMetadata(seed)
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
			weight: policy.providerWeights?.[provider.id]
		})),
		random
	);
}

function multiplyWeight(weight: number, multiplier: number | undefined): number {
	return multiplier === undefined ? weight : weight * multiplier;
}

function getSeedPolicyWeight(
	seed: ReferenceSearchSeed,
	policy: ReferenceSeedWeightPolicy | undefined
): number | undefined {
	if (policy === undefined && seed.weight === undefined) {
		return undefined;
	}

	let weight = seed.weight ?? 1;

	for (const coverageTag of seed.coverageTags ?? []) {
		weight = multiplyWeight(weight, policy?.coverageTagMultipliers?.[coverageTag]);
	}

	for (const sceneType of seed.sceneTypes ?? []) {
		weight = multiplyWeight(weight, policy?.sceneTypeMultipliers?.[sceneType]);
	}

	if (seed.complexity !== undefined) {
		weight = multiplyWeight(weight, policy?.complexityMultipliers?.[seed.complexity]);
	}

	return weight;
}

interface PlannedSeedProviderQueue {
	seed: ReferenceSearchSeed;
	providers: ReferenceProvider[];
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
		createReferencePlanningContext(request),
		random,
		(seed) => getSeedPolicyWeight(seed, policy.seedWeights)
	);
	const seedProviderQueues: PlannedSeedProviderQueue[] = seeds.map((seed) => ({
		seed,
		providers: orderCompatibleProviders(
			options.providers.filter((provider) =>
				providerSupportsSubject(provider, seed.primarySubject)
			),
			policy,
			random
		)
	}));

	while (seedProviderQueues.some((queue) => queue.providers.length > 0)) {
		for (const queue of seedProviderQueues) {
			const provider = queue.providers.shift();

			if (provider === undefined) {
				continue;
			}

			const providerRequest = makeProviderSearchRequest(
				provider,
				queue.seed,
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
				seed: queue.seed,
				request: providerRequest
			});
		}
	}

	return { searches };
}

import {
	isReferenceCategory,
	referenceCategories,
	type ReferenceCategory,
	type ReferenceFeedRequest
} from '$lib/references';
import type { ProviderSearchRequest, ReferenceProvider } from './provider';
import {
	defaultReferenceFeedPolicy,
	type ReferenceFeedPolicy,
	type ReferenceProviderPaginationPolicy,
	type ReferenceSubjectSeed
} from './feed-policy';

export interface PlannedProviderSearch {
	provider: ReferenceProvider;
	category: ReferenceCategory;
	seed: ReferenceSubjectSeed;
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

function uniqueCategories(categories: readonly ReferenceCategory[]): ReferenceCategory[] {
	return [...new Set(categories)];
}

function getEnabledCategories(request: ReferenceFeedRequest): ReferenceCategory[] | undefined {
	const enabledCategories = request.preferences?.enabledCategories;

	if (enabledCategories === undefined) {
		return undefined;
	}

	if (enabledCategories.length === 0) {
		throw new Error('enabledCategories must include at least one category');
	}

	for (const category of enabledCategories) {
		if (!isReferenceCategory(category)) {
			throw new Error('enabledCategories contains an unsupported category');
		}
	}

	return uniqueCategories(enabledCategories);
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
	category: ReferenceCategory,
	seed: ReferenceSubjectSeed,
	count: number,
	policy: ReferenceFeedPolicy,
	random: () => number
): ProviderSearchRequest {
	const request: ProviderSearchRequest = { count, category };

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
		request.category ?? '',
		request.query ?? '',
		request.orientation ?? '',
		request.cursor ?? ''
	].join('\u0000');
}

function providerSupportsCategory(
	provider: ReferenceProvider,
	category: ReferenceCategory
): boolean {
	return provider.capabilities.categories.includes(category);
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

export function createReferenceFeedPlan(
	request: ReferenceFeedRequest = {},
	options: CreateReferenceFeedPlanOptions
): ReferenceFeedPlan {
	const policy = options.policy ?? defaultReferenceFeedPolicy;
	const random = options.random ?? Math.random;
	const enabledCategories = getEnabledCategories(request);
	const enabledCategorySet = new Set(enabledCategories ?? referenceCategories);
	const selectedSearchKeys = new Set<string>();
	const searches: PlannedProviderSearch[] = [];
	const categoryPolicies = weightedShuffle(
		policy.categories
			.filter(
				(categoryPolicy) =>
					enabledCategorySet.has(categoryPolicy.category) && categoryPolicy.subjectSeeds.length > 0
			)
			.map((categoryPolicy) => ({
				item: categoryPolicy,
				weight: normalizeWeight(categoryPolicy.weight)
			})),
		random
	);

	const searchesByCategory = categoryPolicies.map((categoryPolicy) => {
		const compatibleProviders = orderCompatibleProviders(
			options.providers.filter((provider) =>
				providerSupportsCategory(provider, categoryPolicy.category)
			),
			policy,
			random
		);
		const seeds = weightedShuffle(
			categoryPolicy.subjectSeeds.map((seed) => ({
				item: seed,
				weight: normalizeWeight(seed.weight)
			})),
			random
		);
		const categorySearches: PlannedProviderSearch[] = [];

		for (const seed of seeds) {
			for (const provider of compatibleProviders) {
				const providerRequest = makeProviderSearchRequest(
					provider,
					categoryPolicy.category,
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
				categorySearches.push({
					provider,
					category: categoryPolicy.category,
					seed,
					request: providerRequest
				});
			}
		}

		return categorySearches;
	});

	while (searchesByCategory.some((categorySearches) => categorySearches.length > 0)) {
		for (const categorySearches of searchesByCategory) {
			const search = categorySearches.shift();

			if (search !== undefined) {
				searches.push(search);
			}
		}
	}

	return { searches };
}
